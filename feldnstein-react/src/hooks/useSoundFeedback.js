/**
 * Gesture-gated micro-sonics (ADR-0027). Web Audio, no asset files.
 * Business job: confirmation the hand can HEAR — add-to-cart and order
 * success are the two highest-frequency feedback moments in the funnel.
 *
 * Hard rules:
 *  - Never autoplays: unlocked only by the user's first gesture (pointer/key).
 *  - Master gain kept low (~6%); a footer toggle persists mute in localStorage.
 *  - Generated tones only — soft "oil drop" on add, two-note chime on success.
 */

let audioCtx = null
let unlocked = false
let muted = typeof localStorage !== 'undefined' && localStorage.getItem('feldnstein.sound') === 'off'

const MUTE_KEY = 'feldnstein.sound'

function ctx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    audioCtx = new AC()
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function tone(freq, start, duration, peak = 0.06, type = 'sine') {
  const ac = ctx()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

export function unlockSound() {
  unlocked = true
  ctx() // create/resume within the gesture so the browser allows it
}

export function isSoundMuted() {
  return muted
}

export function setSoundMuted(next) {
  muted = next
  try {
    localStorage.setItem(MUTE_KEY, next ? 'off' : 'on')
  } catch {
    /* storage unavailable — mute applies to this page only */
  }
}

/** Single soft "drop" — the oil hitting the bottle. */
export function playDrop() {
  if (!unlocked || muted) return
  const t = ctx()?.currentTime ?? 0
  tone(540, t, 0.22)
  tone(810, t + 0.05, 0.18, 0.045)
}

/** Two-note bell — the order is placed. */
export function playSuccess() {
  if (!unlocked || muted) return
  const t = ctx()?.currentTime ?? 0
  tone(523.25, t, 0.35, 0.055)
  tone(783.99, t + 0.12, 0.5, 0.05)
}
