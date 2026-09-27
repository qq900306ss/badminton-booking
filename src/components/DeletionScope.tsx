import { useTranslation } from 'react-i18next'

// 「刪帳號會刪什麼、留什麼」—— 隱私權政策頁與刪除帳號頁共用同一份文案,
// 兩邊講的內容不會漂移(Google Play 審核會對照這兩頁)。
function list(v: unknown): string[] {
  // 缺翻譯時 t() 會回字串,別讓 .map 炸掉
  return Array.isArray(v) ? (v as string[]) : []
}

export function DeletionScope() {
  const { t } = useTranslation()
  const deleted = list(t('DeletionScope.deleted', { returnObjects: true }))
  const retained = list(t('DeletionScope.retained', { returnObjects: true }))
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-rose-50 p-3 space-y-1.5">
        <p className="text-sm font-bold text-rose-600">🗑️ {t('DeletionScope.deletedTitle')}</p>
        <ul className="space-y-1">
          {deleted.map((it, i) => (
            <li key={i} className="text-sm text-gray-600 flex gap-2">
              <span className="text-rose-400">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl bg-gray-50 p-3 space-y-1.5">
        <p className="text-sm font-bold text-gray-600">📁 {t('DeletionScope.retainedTitle')}</p>
        <ul className="space-y-1">
          {retained.map((it, i) => (
            <li key={i} className="text-sm text-gray-600 flex gap-2">
              <span className="text-gray-400">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-gray-500">👑 {t('DeletionScope.leaderNote')}</p>
    </div>
  )
}
