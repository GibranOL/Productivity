// ─── WEB AUDIO API — no external files needed ────────────────────────────────

let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

function playTone(freq, startAt, duration, gainVal = 0.3) {
  const ac  = getCtx()
  const osc = ac.createOscillator()
  const g   = ac.createGain()

  osc.connect(g)
  g.connect(ac.destination)

  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, startAt)

  g.gain.setValueAtTime(0, startAt)
  g.gain.linearRampToValueAtTime(gainVal, startAt + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, startAt + duration)

  osc.start(startAt)
  osc.stop(startAt + duration + 0.05)
}

// Block ended — two ascending tones (440 Hz → 880 Hz)
export function playBlockEndSound() {
  try {
    const ac  = getCtx()
    const now = ac.currentTime
    playTone(440, now,        0.4, 0.25)
    playTone(880, now + 0.45, 0.5, 0.3)
  } catch (e) {
    // AudioContext blocked until user gesture — silently ignore
  }
}

// Short confirm tick
export function playSuccessSound() {
  try {
    const ac  = getCtx()
    const now = ac.currentTime
    playTone(523, now,        0.12, 0.2)
    playTone(659, now + 0.13, 0.12, 0.2)
    playTone(784, now + 0.26, 0.2,  0.25)
  } catch (e) {}
}

// Soft warning beep
export function playWarningSound() {
  try {
    const ac  = getCtx()
    const now = ac.currentTime
    playTone(330, now,        0.3, 0.2)
    playTone(330, now + 0.35, 0.3, 0.15)
  } catch (e) {}
}
