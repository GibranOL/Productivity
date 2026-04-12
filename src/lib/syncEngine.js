/**
 * Appwrite <-> Zustand Sync Engine
 *
 * Provides a reusable pattern for syncing Zustand store slices with Appwrite collections.
 * Each synced store follows this lifecycle:
 *   1. LOAD: Fetch all user documents on auth
 *   2. MUTATE: Optimistic local update -> write to Appwrite -> queue if offline
 *   3. SUBSCRIBE: Appwrite Realtime pushes cross-device changes
 *   4. OFFLINE: localStorage cache via Zustand persist, flush queue on reconnect
 */
import { databases, client, ID, Query, Permission, Role } from './appwrite'
import { DATABASE_ID } from './appwriteCollections'

/**
 * Create sync actions for a Zustand store slice.
 *
 * @param {object} config
 * @param {string} config.collectionId - Appwrite collection ID
 * @param {string} config.stateKey - Key in store where items array lives (e.g. 'events', 'projects')
 * @param {function} config.mapFromDoc - (doc) => local item shape
 * @param {function} config.mapToDoc - (item) => Appwrite document fields
 * @param {function} [config.buildQueries] - (userId) => Query[] for loading
 */
export function createSyncActions(config) {
  const { collectionId, stateKey, mapFromDoc, mapToDoc, buildQueries } = config

  return (set, get) => ({
    // Sync metadata (not persisted)
    _syncMeta: {
      loading: false,
      subscribed: false,
      offlineQueue: [],
      unsubscribe: null,
    },

    /**
     * Load all documents for this user from Appwrite.
     * Called once after authentication.
     */
    async loadFromAppwrite(userId) {
      set((s) => ({ _syncMeta: { ...s._syncMeta, loading: true } }))
      try {
        const queries = buildQueries
          ? buildQueries(userId)
          : [Query.equal('user_id', userId), Query.limit(5000)]

        const response = await databases.listDocuments(DATABASE_ID, collectionId, queries)
        const items = response.documents.map(mapFromDoc)
        set({ [stateKey]: items, _syncMeta: { ...get()._syncMeta, loading: false } })
        return items
      } catch (err) {
        console.error(`[sync] Failed to load ${collectionId}:`, err)
        set((s) => ({ _syncMeta: { ...s._syncMeta, loading: false } }))
        // Fall back to whatever is in local state (from localStorage persist)
        return get()[stateKey] || []
      }
    },

    /**
     * Create a new document in Appwrite and add to local state.
     * Optimistic: adds locally first, then writes to Appwrite.
     */
    async createDocument(data) {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const localItem = mapFromDoc({ $id: tempId, ...data })

      // Optimistic local update
      set((s) => ({ [stateKey]: [...s[stateKey], localItem] }))

      try {
        // Build document-level permissions so the owner can read/update/delete
        const userId = data.userId || data.user_id
        const permissions = userId
          ? [
              Permission.read(Role.user(userId)),
              Permission.update(Role.user(userId)),
              Permission.delete(Role.user(userId)),
            ]
          : []

        const doc = await databases.createDocument(
          DATABASE_ID,
          collectionId,
          ID.unique(),
          mapToDoc(data),
          permissions
        )
        // Replace temp item with real one
        set((s) => ({
          [stateKey]: s[stateKey].map((item) =>
            item.id === tempId ? mapFromDoc(doc) : item
          ),
        }))
        return mapFromDoc(doc)
      } catch (err) {
        console.error(`[sync] Failed to create in ${collectionId}:`, err)
        // Queue for retry
        get()._syncMeta.offlineQueue.push({ op: 'create', data })
        return localItem
      }
    },

    /**
     * Update an existing document in Appwrite and local state.
     */
    async updateDocument(documentId, patch) {
      // Optimistic local update
      set((s) => ({
        [stateKey]: s[stateKey].map((item) =>
          item.id === documentId ? { ...item, ...patch } : item
        ),
      }))

      try {
        const docPatch = mapToDoc(patch)
        await databases.updateDocument(DATABASE_ID, collectionId, documentId, docPatch)
      } catch (err) {
        console.error(`[sync] Failed to update ${collectionId}/${documentId}:`, err)
        get()._syncMeta.offlineQueue.push({ op: 'update', documentId, patch })
      }
    },

    /**
     * Delete a document from Appwrite and local state.
     */
    async deleteDocument(documentId) {
      // Optimistic local removal
      set((s) => ({
        [stateKey]: s[stateKey].filter((item) => item.id !== documentId),
      }))

      try {
        await databases.deleteDocument(DATABASE_ID, collectionId, documentId)
      } catch (err) {
        console.error(`[sync] Failed to delete ${collectionId}/${documentId}:`, err)
        get()._syncMeta.offlineQueue.push({ op: 'delete', documentId })
      }
    },

    /**
     * Subscribe to Appwrite Realtime for cross-device sync.
     * When another device creates/updates/deletes, the local state updates.
     */
    subscribeRealtime() {
      if (get()._syncMeta.subscribed) return

      const channel = `databases.${DATABASE_ID}.collections.${collectionId}.documents`
      const unsubscribe = client.subscribe(channel, (response) => {
        const events = response.events || []
        const doc = response.payload

        if (events.some((e) => e.endsWith('.create'))) {
          const newItem = mapFromDoc(doc)
          set((s) => {
            // Don't duplicate if already present (from our own optimistic create)
            const exists = s[stateKey].some((item) => item.id === doc.$id)
            if (exists) return s
            return { [stateKey]: [...s[stateKey], newItem] }
          })
        }

        if (events.some((e) => e.endsWith('.update'))) {
          const updated = mapFromDoc(doc)
          set((s) => ({
            [stateKey]: s[stateKey].map((item) =>
              item.id === doc.$id ? updated : item
            ),
          }))
        }

        if (events.some((e) => e.endsWith('.delete'))) {
          set((s) => ({
            [stateKey]: s[stateKey].filter((item) => item.id !== doc.$id),
          }))
        }
      })

      set((s) => ({
        _syncMeta: { ...s._syncMeta, subscribed: true, unsubscribe },
      }))
    },

    /**
     * Unsubscribe from Realtime updates.
     */
    unsubscribeRealtime() {
      const { unsubscribe } = get()._syncMeta
      if (unsubscribe) {
        unsubscribe()
        set((s) => ({
          _syncMeta: { ...s._syncMeta, subscribed: false, unsubscribe: null },
        }))
      }
    },

    /**
     * Flush offline queue — retry failed mutations.
     * Call when connectivity is restored.
     */
    async flushOfflineQueue() {
      const queue = [...get()._syncMeta.offlineQueue]
      if (queue.length === 0) return

      set((s) => ({ _syncMeta: { ...s._syncMeta, offlineQueue: [] } }))

      for (const entry of queue) {
        try {
          if (entry.op === 'create') {
            const uid = entry.data.userId || entry.data.user_id
            const perms = uid
              ? [
                  Permission.read(Role.user(uid)),
                  Permission.update(Role.user(uid)),
                  Permission.delete(Role.user(uid)),
                ]
              : []
            await databases.createDocument(
              DATABASE_ID,
              collectionId,
              ID.unique(),
              mapToDoc(entry.data),
              perms
            )
          } else if (entry.op === 'update') {
            await databases.updateDocument(
              DATABASE_ID,
              collectionId,
              entry.documentId,
              mapToDoc(entry.patch)
            )
          } else if (entry.op === 'delete') {
            await databases.deleteDocument(DATABASE_ID, collectionId, entry.documentId)
          }
        } catch (err) {
          console.error(`[sync] Flush failed for ${entry.op}:`, err)
          // Re-queue failed items
          set((s) => ({
            _syncMeta: {
              ...s._syncMeta,
              offlineQueue: [...s._syncMeta.offlineQueue, entry],
            },
          }))
        }
      }
    },
  })
}

/**
 * Listen for online/offline events and flush queues across all synced stores.
 * Call once at app startup after auth.
 */
export function setupConnectivityListener(stores) {
  window.addEventListener('online', () => {
    for (const store of stores) {
      store.getState().flushOfflineQueue()
    }
  })
}
