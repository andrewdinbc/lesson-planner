// lib/sounds.js
// Arcade-style sound effects for the QR games, in the spirit of Blooket's
// upbeat audio cues (2026-07-17 request). Synthesized on the fly with the
// Web Audio API rather than shipping audio files -- no assets to host,
// no load time, works instantly on any device that scans a QR code cold.
// Safe to import and call from any 'use client' component; every function
// no-ops silently in non-browser contexts (SSR) or if AudioContext is
// unavailable/blocked (some browsers require a user gesture first, which
// every call site here already has -- these only fire on click/keypress).

let ctx = null
function getCtx() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, startTime, duration, type = 'sine', gain = 0.15) {
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(gain, c.currentTime + startTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startTime + duration)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(c.currentTime + startTime)
  osc.stop(c.currentTime + startTime + duration)
}

export function playClick() {
  tone(600, 0, 0.06, 'square', 0.08)
}

export function playCorrect() {
  // bright ascending arpeggio -- the "ding ding ding!" feeling
  tone(523.25, 0, 0.12, 'triangle')      // C5
  tone(659.25, 0.08, 0.12, 'triangle')   // E5
  tone(783.99, 0.16, 0.18, 'triangle')   // G5
}

export function playWrong() {
  // low buzzy descending pair -- unmistakably "no", not harsh
  tone(220, 0, 0.15, 'sawtooth', 0.1)
  tone(164.81, 0.1, 0.22, 'sawtooth', 0.1)
}

export function playCountdownTick() {
  tone(880, 0, 0.05, 'square', 0.06)
}

export function playGameStart() {
  tone(392, 0, 0.1, 'triangle')
  tone(523.25, 0.1, 0.1, 'triangle')
  tone(659.25, 0.2, 0.16, 'triangle')
}

export function playVictoryFanfare() {
  const notes = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => tone(f, i * 0.13, 0.22, 'triangle', 0.14))
}

export function playRaceAdvance() {
  tone(700, 0, 0.08, 'square', 0.1)
  tone(900, 0.05, 0.1, 'square', 0.1)
}
