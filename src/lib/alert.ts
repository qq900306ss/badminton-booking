// "輪到你了" alert helpers — sound (Web Audio, no asset), vibration, notification.

let ctx: AudioContext | null = null

export function playChime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = ctx || new AC()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    ;[880, 1320, 1760].forEach((freq, i) => {
      const o = ctx!.createOscillator()
      const g = ctx!.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      o.connect(g)
      g.connect(ctx!.destination)
      const t = now + i * 0.16
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.3, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
      o.start(t)
      o.stop(t + 0.16)
    })
  } catch {
    // ignore — audio not available
  }
}

export function vibrate() {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    // ignore
  }
}

export function notifyTurn(body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🏸 輪到你上場了!', { body, icon: '/icon.svg' })
    }
  } catch {
    // ignore
  }
}

// best-effort: ask for notification permission (call from a user gesture)
export function requestNotify() {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  } catch {
    // ignore
  }
}
