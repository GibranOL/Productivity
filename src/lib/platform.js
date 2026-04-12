/**
 * Platform detection utilities.
 * Mac runs as Tauri native app with access to Ollama (Cortana).
 * Pixel runs as PWA synced via Appwrite.
 */

export function isTauri() {
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window
}

export function isPWA() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export function hasCortanaAccess() {
  // Cortana (Ollama) only available on Mac via Tauri
  return isTauri()
}
