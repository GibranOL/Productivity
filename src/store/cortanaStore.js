import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Cortana Store — manages chat state, connection status, and conversation history.
 *
 * Persisted: messages (last 100), selectedModel, thinkMode
 * Ephemeral: streaming, connectionStatus, abortController
 */

const MAX_MESSAGES = 100

const useCortanaStore = create(
  persist(
    (set, get) => ({
      // ─── Chat Messages ─────────────────────────────────────────
      messages: [],
      // Each message: { role: 'user'|'assistant'|'error'|'action', content: string, timestamp: number, actions?: [] }

      addMessage: (role, content, extra = {}) => set((s) => ({
        messages: [
          ...s.messages.slice(-(MAX_MESSAGES - 1)),
          { role, content, timestamp: Date.now(), ...extra },
        ],
      })),

      updateStreamingMessage: (content) => set((s) => {
        const msgs = [...s.messages]
        const last = msgs[msgs.length - 1]
        if (last?.streaming) msgs[msgs.length - 1] = { ...last, content }
        return { messages: msgs }
      }),

      finalizeStreaming: () => set((s) => {
        const msgs = s.messages.map((m) =>
          m.streaming ? { ...m, streaming: false } : m
        )
        return { messages: msgs }
      }),

      clearMessages: () => set({ messages: [] }),

      // ─── Connection State ──────────────────────────────────────
      connectionStatus: 'idle', // 'idle' | 'checking' | 'online' | 'offline'
      availableModels: [],
      selectedModel: 'llama3.2:3b',
      thinkMode: false,

      setConnectionStatus: (status) => set({ connectionStatus: status }),
      setAvailableModels: (models) => set({ availableModels: models }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setThinkMode: (mode) => set({ thinkMode: mode }),

      // ─── Streaming State (ephemeral) ───────────────────────────
      streaming: false,
      setStreaming: (val) => set({ streaming: val }),

      // ─── Pending Actions ───────────────────────────────────────
      // Actions suggested by Cortana awaiting user confirmation
      pendingActions: [],

      addPendingAction: (action) => set((s) => ({
        pendingActions: [...s.pendingActions, { ...action, id: Date.now().toString() }],
      })),

      removePendingAction: (id) => set((s) => ({
        pendingActions: s.pendingActions.filter((a) => a.id !== id),
      })),

      clearPendingActions: () => set({ pendingActions: [] }),

      // ─── Helpers ───────────────────────────────────────────────
      getConversationForAPI: () => {
        return get()
          .messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map(({ role, content }) => ({ role, content }))
      },

      isOnline: () => get().connectionStatus === 'online',
    }),
    {
      name: 'gibran-os-cortana-v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate(persisted, fromVersion) {
        if (fromVersion < 1) {
          // v0 → v1: switch default model from gemma4:e4b to llama3.2:3b
          if (persisted.selectedModel === 'gemma4:e4b') {
            persisted.selectedModel = 'llama3.2:3b'
          }
        }
        return persisted
      },
      partialize: (state) => ({
        messages: state.messages
          .filter((m) => !m.streaming)
          .slice(-MAX_MESSAGES),
        selectedModel: state.selectedModel,
        thinkMode: state.thinkMode,
      }),
    }
  )
)

export default useCortanaStore
