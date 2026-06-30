import { useState } from 'react'
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
}: {
  view: SessionView
  players: SessionPlayer[]
  myIds: string[]
}) {
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
          <p className="font-bold text-brand-pink text-sm">⚖️ 本場實施公平讓分</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {view.fair_enforced ? (
              <>打超過 <b>{view.fair_limit?.toFixed(0)}</b> 場的人會暫時不能上場/排隊,讓打較少的人先打;追上後自動恢復。</>
            ) : (
              <>目前在場人數還不多,暫時自由上場(人多了才會開始讓分)。</>
            )}
          </p>
          <details className="text-xs text-gray-500 mt-1.5">
            <summary className="cursor-pointer text-gray-400">怎麼運作?</summary>
            <div className="mt-1 space-y-1 leading-relaxed">
              <p>• 系統算「打最多那群人」的平均場數,打超過(平均＋團主設定)的人先讓一下。</p>
              <p>• 還沒打滿寬限場數的人不受限;大家追上後被擋的人自動恢復。</p>
              <p>• 想打卻被擋時,等別人也打幾場、平均上來,你就能再排了。</p>
            </div>
          </details>
        </div>
      )}

      <button
        onClick={() => setOpenList((v) => !v)}
        className="w-full flex items-center justify-between text-sm font-bold text-gray-600"
      >
        <span>📊 大家打的場數</span>
        <span className="text-xs text-gray-400">{openList ? '收合 ▲' : '展開 ▼'}</span>
      </button>

      {openList && (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {ranked.map((p, i) => {
            const mine = myIds.includes(p.player_id)
            const over = view.fair_enforced && (p.games || 0) > limit
            return (
              <div
                key={p.player_id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-xl ${mine ? 'bg-brand-pink/10' : ''}`}
              >
                <span className="text-xs text-gray-300 w-4 text-right">{i + 1}</span>
                <div className="w-6 h-6 rounded-full bg-brand-pink/15 flex items-center justify-center shrink-0 overflow-hidden">
                  {isPhotoUrl(p.avatar_url) ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">{p.avatar_url || '🏸'}</span>
                  )}
                </div>
                <span className={`flex-1 text-sm truncate ${mine ? 'font-bold text-gray-700' : 'text-gray-600'}`}>
                  {p.display_name}{mine && ' (你)'}
                </span>
                {over && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">讓分中</span>}
                <span className="text-sm font-bold text-gray-700 tabular-nums">{p.games || 0}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
