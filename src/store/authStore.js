import { create } from 'zustand'
import { account } from '../lib/appwrite'
import { OAuthProvider } from 'appwrite'

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  /**
   * Initialize auth — check for existing session.
   * Called once on app mount.
   */
  async init() {
    set({ loading: true, error: null })
    try {
      const user = await account.get()
      set({ user, loading: false })
      return user
    } catch {
      // No active session
      set({ user: null, loading: false })
      return null
    }
  },

  /**
   * Login with Google OAuth via Appwrite.
   * Redirects to Google, then back to the app.
   */
  async loginWithGoogle() {
    set({ loading: true, error: null })
    try {
      const currentUrl = window.location.href
      account.createOAuth2Session(
        OAuthProvider.Google,
        currentUrl, // success redirect
        currentUrl  // failure redirect
      )
    } catch (err) {
      console.error('[auth] Google OAuth failed:', err)
      set({ loading: false, error: err.message })
    }
  },

  /**
   * Logout — delete current session.
   */
  async logout() {
    try {
      await account.deleteSession('current')
    } catch (err) {
      console.error('[auth] Logout error:', err)
    }
    set({ user: null, session: null })
  },

  /**
   * Get the current user ID (shortcut).
   */
  getUserId() {
    return get().user?.$id || null
  },
}))

export default useAuthStore
