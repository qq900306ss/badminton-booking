// a small client-side notifications log the player can review (輪到你了、被移出…).
export interface Notif {
  id: string
  text: string
  ts: number
}

const KEY = 'badminton_notifs'
const SEEN = 'badminton_notifs_seen'
const MAX = 50

export function listNotifs(): Notif[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as Notif[]
  } catch {
    return []
  }
}

export function pushNotif(text: string) {
  const list = listNotifs()
  list.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, ts: Date.now() })
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  window.dispatchEvent(new Event('notifs-changed'))
}

export function unreadCount(): number {
  const seen = Number(localStorage.getItem(SEEN) || 0)
  return listNotifs().filter((n) => n.ts > seen).length
}

export function markSeen() {
  localStorage.setItem(SEEN, String(Date.now()))
  window.dispatchEvent(new Event('notifs-changed'))
}

export function clearNotifs() {
  localStorage.removeItem(KEY)
  window.dispatchEvent(new Event('notifs-changed'))
}
