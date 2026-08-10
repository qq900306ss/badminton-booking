import { useState } from 'react'
import { useTranslation } from 'react-i18next'

// 📢 場內公告:團主在後台寫的訊息,場內每個人都看得到(WS 即時更新)。
// 可收起;收起狀態記住「當時的內容」——團主一改公告,自動重新展開,
// 舊公告收掉不代表永遠看不到新公告。
export function AnnouncementBanner({ sessionId, text }: { sessionId: string; text?: string }) {
  const { t } = useTranslation()
  const key = `announce_closed_${sessionId}`
  // lazy init 只讀一次 localStorage;之後的開合都走 state
  const [closedText, setClosedText] = useState<string | null>(() => localStorage.getItem(key))

  const body = (text ?? '').trim()
  if (!body) return null
  const collapsed = closedText === body

  function toggle() {
    const next = collapsed ? null : body
    setClosedText(next)
    if (next) localStorage.setItem(key, next)
    else localStorage.removeItem(key)
  }

  return (
    <div className="mx-4 mt-3 rounded-2xl bg-sky-50 ring-1 ring-sky-200 overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center justify-between px-4 py-2.5">
        <span className="font-bold text-sky-700 text-sm">📢 {t('AnnouncementBanner.title')}</span>
        <span className="text-xs font-semibold text-sky-400">
          {collapsed ? t('AnnouncementBanner.expand') : t('AnnouncementBanner.collapse')}
        </span>
      </button>
      {!collapsed && (
        <p className="px-4 pb-3 text-sm text-sky-800 whitespace-pre-wrap">{body}</p>
      )}
    </div>
  )
}
