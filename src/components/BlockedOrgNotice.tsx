import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBlockActions, useBlockPending } from '../hooks/useBlocks'

// 用連結 / QR 進到「已封鎖的團主」開的團:不顯示團名、簡介、公告,只給「解除封鎖」與回大廳。
// 解除後封鎖名單快取立刻更新,所在頁面自動換回正常畫面。
export function BlockedOrgNotice({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { unblock } = useBlockActions()
  const blockPending = useBlockPending() // 剛在場內按封鎖、還沒回來 → 先別給解除(避免順序打架)
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <div className="card w-full max-w-sm text-center space-y-3">
        <div className="text-4xl grayscale">🚫</div>
        <p className="font-bold text-gray-700">{t('BlockedOrgNotice.title')}</p>
        <p className="text-sm text-gray-400">{t('BlockedOrgNotice.body')}</p>
        <button
          onClick={() => unblock.mutate({ type: 'org', ref: orgId })}
          disabled={unblock.isPending || blockPending}
          className="btn-secondary w-full disabled:opacity-40"
        >
          {t('BlockedOrgNotice.unblock')}
        </button>
        <button onClick={() => nav('/', { replace: true })} className="btn-primary w-full">
          {t('BlockedOrgNotice.backToLobby')}
        </button>
      </div>
    </div>
  )
}
