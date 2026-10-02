import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useBlockList, useBlockActions, useBlockPending } from '../hooks/useBlocks'
import { isPhotoUrl, DEFAULT_ORG_AVATAR } from '../lib/avatar'

// 設定裡的「🚫 封鎖名單」:列出封鎖過的球友 / 團主(名稱、頭像是封鎖當下的快照)+ 解除封鎖。
// 從設定彈窗(fixed z-50)裡打開,所以用 portal 掛到 body,不被設定彈窗的 stacking context 關住;
// 同樣 z-50(DOM 在後面會疊在設定上),低於 toast 60,解除封鎖的提示看得到。
export function BlockListButton({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const { blocks, isLoading } = useBlockList()
  const { unblock } = useBlockActions()
  const blockPending = useBlockPending()

  return (
    <>
      <button onClick={() => setOpen(true)} className={className || 'text-xs text-gray-400'}>
        🚫 {t('BlockListButton.button')}
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
            onClick={() => setOpen(false)}
          >
            <div
              className="bg-white rounded-3xl p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-gray-800">🚫 {t('BlockListButton.title')}</span>
                <button onClick={() => setOpen(false)} className="text-gray-400 font-bold" aria-label={t('BlockListButton.close')}>
                  ✕
                </button>
              </div>
              <p className="text-xs text-gray-400">{t('BlockListButton.hint')}</p>

              {isLoading ? (
                <p className="text-sm text-gray-400 text-center py-6">{t('BlockListButton.loading')}</p>
              ) : blocks.length === 0 ? (
                <div className="text-center py-6 space-y-1">
                  <div className="text-3xl">🕊️</div>
                  <p className="text-sm text-gray-400">{t('BlockListButton.empty')}</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {blocks.map((b) => {
                    const isOrg = b.type === 'org'
                    // 沒帳號的球友(團主手動加的名字)ref = "s:<player_id>",只在當時那一場有效
                    const sessionOnly = !isOrg && b.ref.startsWith('s:')
                    const date = b.created_at ? new Date(b.created_at) : null
                    return (
                      <li key={`${b.type}:${b.ref}`} className="flex items-center gap-3 bg-gray-50 rounded-2xl px-3 py-2.5">
                        <div className="w-10 h-10 rounded-full bg-brand-pink/15 flex items-center justify-center shrink-0 overflow-hidden">
                          {isPhotoUrl(b.avatar_url) ? (
                            <img src={b.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">
                              {b.avatar_url || (isOrg ? DEFAULT_ORG_AVATAR : [...(b.name || '')][0]?.toUpperCase() || '🏸')}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-700 truncate">{b.name || t('BlockListButton.noName')}</p>
                          <p className="text-[11px] text-gray-400 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`font-bold px-1.5 py-0.5 rounded-full ${
                                isOrg ? 'bg-brand-lavender/60 text-violet-600' : 'bg-brand-mint/60 text-emerald-700'
                              }`}
                            >
                              {t(isOrg ? 'BlockListButton.typeOrg' : 'BlockListButton.typePlayer')}
                            </span>
                            {sessionOnly && <span>{t('BlockListButton.sessionOnly')}</span>}
                            {date && !isNaN(date.getTime()) && <span>{date.toLocaleDateString(i18n.language)}</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => unblock.mutate({ type: b.type, ref: b.ref })}
                          disabled={blockPending}
                          className="shrink-0 text-xs font-bold text-brand-pink border-2 border-brand-pink/40 rounded-full px-3 py-1.5
                            active:scale-95 transition-transform disabled:opacity-40"
                        >
                          {t('BlockListButton.unblock')}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
