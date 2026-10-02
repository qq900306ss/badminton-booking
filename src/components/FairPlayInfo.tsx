import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import type { SessionView, SessionPlayer } from '../api/client'
import { isPhotoUrl } from '../lib/avatar'

// Player-facing panel for the 公平讓分 / 顯示場數 advanced features.
// - show_games on  → everyone's game counts (sorted, you highlighted)
// - fair_play on   → a banner + live status + foldable rule explanation
// (fair_play forces show_games on, so this panel always shows counts when fair.)
export function FairPlayInfo({
  view,
  players,
  myIds,
  isBlocked,
  playerAction,
}: {
  view: SessionView
  players: SessionPlayer[]
  myIds: string[]
  // 檢舉 / 封鎖(同 CourtCard):已封鎖的人遮名字頭像;playerAction 回 undefined = 不可點
  isBlocked?: (p: SessionPlayer) => boolean
  playerAction?: (p: SessionPlayer) => (() => void) | undefined
}) {
  const { t } = useTranslation()
  const [openList, setOpenList] = useState(false)
  if (!view.show_games && !view.fair_play) return null

  const ranked = players
    .filter((p) => !p.pending)
    .slice()
    .sort((a, b) => (b.games || 0) - (a.games || 0))
  const limit = view.fair_limit ?? 0

  return (
    <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm p-3 space-y-2">
      {view.fair_play && (
        <div>
          <p className="font-bold text-brand-pink text-sm">{t('FairPlayInfo.banner')}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {view.fair_enforced ? (
              <Trans
                i18nKey="FairPlayInfo.enforced"
                values={{ limit: view.fair_limit?.toFixed(0) }}
                components={{ b: <b /> }}
              />
            ) : (
              <>{t('FairPlayInfo.notEnforced')}</>
            )}
          </p>
          <details className="text-xs text-gray-500 mt-1.5">
            <summary className="cursor-pointer text-gray-400">{t('FairPlayInfo.howItWorks')}</summary>
            <div className="mt-1 space-y-1 leading-relaxed">
              <p>{t('FairPlayInfo.rule1')}</p>
              <p>{t('FairPlayInfo.rule2')}</p>
              <p>{t('FairPlayInfo.rule3')}</p>
            </div>
          </details>
        </div>
      )}

      <button
        onClick={() => setOpenList((v) => !v)}
        className="w-full flex items-center justify-between text-sm font-bold text-gray-600"
      >
        <span>{t('FairPlayInfo.gamesTitle')}</span>
        <span className="text-xs text-gray-400">{openList ? t('FairPlayInfo.collapse') : t('FairPlayInfo.expand')}</span>
      </button>

      {openList && (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {ranked.map((p, i) => {
            const mine = myIds.includes(p.player_id)
            const over = view.fair_enforced && (p.games || 0) > limit
            const blocked = !mine && !!isBlocked?.(p)
            const onTap = mine ? undefined : playerAction?.(p)
            const Row = onTap ? 'button' : 'div'
            return (
              <Row
                key={p.player_id}
                {...(onTap ? { type: 'button' as const, onClick: onTap } : {})}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-xl ${mine ? 'bg-brand-pink/10' : ''} ${
                  onTap ? 'active:bg-gray-50' : ''
                }`}
              >
                <span className="text-xs text-gray-300 w-4 text-right">{i + 1}</span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                    blocked ? 'bg-gray-200' : 'bg-brand-pink/15'
                  }`}
                >
                  {blocked ? (
                    <span className="text-xs grayscale">🚫</span>
                  ) : isPhotoUrl(p.avatar_url) ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">{p.avatar_url || '🏸'}</span>
                  )}
                </div>
                <span
                  className={`flex-1 text-sm truncate ${mine ? 'font-bold text-gray-700' : blocked ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  {blocked ? t('useBlocks.blockedPlayer') : p.display_name}
                  {mine && t('FairPlayInfo.youSuffix')}
                </span>
                {over && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">{t('FairPlayInfo.yielding')}</span>}
                <span className="text-sm font-bold text-gray-700 tabular-nums">{p.games || 0}</span>
              </Row>
            )
          })}
        </div>
      )}
    </div>
  )
}
