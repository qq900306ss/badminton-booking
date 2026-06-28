import { useEffect, useReducer, useState } from 'react'
import { listNotifs, unreadCount, markSeen, clearNotifs } from '../lib/notifications'

function relTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return '剛剛'
  if (s < 3600) return `${Math.floor(s / 60)} 分鐘前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小時前`
  return `${Math.floor(s / 86400)} 天前`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [, bump] = useReducer((n) => n + 1, 0)

  useEffect(() => {
    const h = () => bump()
    window.addEventListener('notifs-changed', h)
    return () => window.removeEventListener('notifs-changed', h)
  }, [])

  const notifs = listNotifs()
  const unread = unreadCount()

  return (
    <>
      <button
        onClick={() => { setOpen(true); markSeen() }}
        className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
        aria-label="通知"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-16 px-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
              <span className="font-extrabold text-gray-800">🔔 通知</span>
              <div className="flex items-center gap-3 text-sm">
                {notifs.length > 0 && (
                  <button onClick={() => clearNotifs()} className="text-gray-400">清除</button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-400 font-bold">✕</button>
              </div>
            </div>
            <div className="overflow-y-auto p-3 space-y-2">
              {notifs.length === 0 ? (
                <p className="text-center text-sm text-gray-300 py-8">目前沒有通知</p>
              ) : (
                notifs.map((n) => (
                  <div key={n.id} className="bg-gray-50 rounded-2xl px-3 py-2.5">
                    <p className="text-sm font-semibold text-gray-700">{n.text}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{relTime(n.ts)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
