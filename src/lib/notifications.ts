// a small client-side notifications log the player can review (輪到你了、被移出…).
// Scoped PER SESSION — the bell on a court only shows that court's notifications,
// not everything from every session the player has ever been in.
export interface Notif {
  id: string
  text: string
  ts: number
}

const keyFor = (sid: string) => `badminton_notifs_${sid}`
const seenFor = (sid: string) => `badminton_notifs_seen_${sid}`
const MAX = 50

export function listNotifs(sid: string): Notif[] {
  if (!sid) return []
  try {
    return JSON.parse(localStorage.getItem(keyFor(sid)) || '[]') as Notif[]
  } catch {
    return []
  }
}

export function pushNotif(sid: string, text: string) {
  if (!sid) return
  const list = listNotifs(sid)
  list.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, ts: Date.now() })
  localStorage.setItem(keyFor(sid), JSON.stringify(list.slice(0, MAX)))
  window.dispatchEvent(new Event('notifs-changed'))
}

export function unreadCount(sid: string): number {
  if (!sid) return 0
  const seen = Number(localStorage.getItem(seenFor(sid)) || 0)
  return listNotifs(sid).filter((n) => n.ts > seen).length
}

export function markSeen(sid: string) {
  if (!sid) return
  localStorage.setItem(seenFor(sid), String(Date.now()))
  window.dispatchEvent(new Event('notifs-changed'))
}

export function clearNotifs(sid: string) {
  if (!sid) return
  localStorage.removeItem(keyFor(sid))
  window.dispatchEvent(new Event('notifs-changed'))
}
