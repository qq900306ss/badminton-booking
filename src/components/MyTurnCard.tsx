import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CourtView } from '../api/client'

// 球場頁最上面的「我的狀態」:球友最在意的就是「我什麼時候能打」。
//   - 在場上 → 哪一場、打了幾分鐘、投票結束
//   - 在排隊 → 哪一場、下一組就是你、大約還要等多久
//   - 還沒排 → 幫你挑「最快輪到」的那一場,一鍵排進去
// 一局大約幾分鐘用 AVG_GAME_MIN 估(只用來顯示「大約」,不影響任何規則)。

const AVG_GAME_MIN = 15

function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20_000)
    return () => clearInterval(id)
  }, [])
  return now
}

const courtTitle = (c: CourtView, t: (k: string, o?: Record<string, unknown>) => string) =>
  c.name?.trim() ? c.name : t('CourtCard.courtLabel', { num: c.court_num })

// 這場還要打多久才會換下一組(分鐘);沒在打(沒滿 4 人)回 null
function remainingMin(c: CourtView, now: number, stopAt?: string): number | null {
  const filled = c.playing.filter((s) => s.player_id).length
  if (filled < 4 || !c.started_at) return null
  const stop = stopAt ? new Date(stopAt).getTime() : NaN
  const end = Number.isNaN(stop) ? now : Math.min(now, stop)
  const elapsed = Math.max(0, (end - new Date(c.started_at).getTime()) / 60000)
  return Math.max(0, Math.round(AVG_GAME_MIN - elapsed))
}

export function MyTurnCard({
  courts,
  me,
  stopAt,
  queueLocked,
  queueOpensAt,
  busy,
  onJoinPlaying,
  onJoinQueue,
  onVoteEnd,
  onJump,
}: {
  courts: CourtView[]
  me: string | null // 目前操作的身分(自己或切換中的家人)
  stopAt?: string
  queueLocked: boolean // 還沒到開放排隊時間
  queueOpensAt?: string // 「19:00」
  busy: boolean
  onJoinPlaying: (courtId: string, position: number) => void
  onJoinQueue: (courtId: string) => void
  onVoteEnd: (courtId: string) => void
  onJump: (courtId: string) => void // 捲到那一場
}) {
  const { t } = useTranslation()
  const now = useNow()
  if (!me) return null

  const playingAt = courts.find((c) => c.playing.some((s) => s.player_id === me))
  const queuedAt = courts.find((c) => c.queue.some((s) => s.player_id === me))

  // ── 在場上 ──
  if (playingAt) {
    const full = playingAt.playing.filter((s) => s.player_id).length === 4
    const mins = full && playingAt.started_at ? Math.max(0, Math.floor((Math.min(now, stopAt ? new Date(stopAt).getTime() : now) - new Date(playingAt.started_at).getTime()) / 60000)) : null
    const votes = playingAt.end_votes ?? []
    const needed = playingAt.end_votes_needed ?? 2
    const iVoted = votes.includes(me)
    return (
      <Shell tone="mint" onClick={() => onJump(playingAt.court_id)}>
        <Line emoji="🏸" title={t('MyTurn.playingAt', { court: courtTitle(playingAt, t) })} sub={full ? t('MyTurn.playedMins', { n: mins ?? 0 }) : t('MyTurn.waitingFull')} />
        {full && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onVoteEnd(playingAt.court_id)
            }}
            disabled={busy}
            className={`shrink-0 rounded-2xl px-3 py-2 text-xs font-extrabold ${iVoted ? 'bg-rose-100 text-rose-500' : 'bg-white text-emerald-700'} disabled:opacity-50`}
          >
            {iVoted ? t('MyTurn.voted', { v: votes.length, n: needed }) : t('MyTurn.voteEnd', { v: votes.length, n: needed })}
          </button>
        )}
      </Shell>
    )
  }

  // ── 在排隊 ──
  if (queuedAt) {
    const rem = remainingMin(queuedAt, now, stopAt)
    const sub =
      rem === null ? t('MyTurn.startsWhenFull') : rem <= 1 ? t('MyTurn.anyMoment') : t('MyTurn.aboutMins', { n: rem })
    return (
      <Shell tone="yellow" onClick={() => onJump(queuedAt.court_id)}>
        <Line emoji="⏳" title={t('MyTurn.nextAt', { court: courtTitle(queuedAt, t) })} sub={sub} />
        <span className="shrink-0 text-xs font-extrabold text-amber-700">{t('MyTurn.see')} ›</span>
      </Shell>
    )
  }

  // ── 還沒排 ──
  if (queueLocked) {
    return (
      <Shell tone="lavender">
        <Line emoji="⏰" title={t('MyTurn.queueOpensAt', { time: queueOpensAt })} sub={t('MyTurn.queueOpensHint')} />
      </Shell>
    )
  }
  // 挑最快輪到的一場:有空位且沒人排 → 馬上上;否則看「這局還剩多久」+ 排隊空間
  type Pick = { court: CourtView; wait: number; seat: number | null }
  const picks: Pick[] = []
  for (const c of courts) {
    if (c.locked) continue
    const empty = c.playing.findIndex((s) => !s.player_id)
    if (empty >= 0 && c.queue.length === 0) {
      picks.push({ court: c, wait: 0, seat: empty })
    } else if (c.queue.length < 4) {
      const rem = remainingMin(c, now, stopAt)
      picks.push({ court: c, wait: rem ?? AVG_GAME_MIN, seat: null })
    }
  }
  picks.sort((a, b) => a.wait - b.wait || a.court.queue.length - b.court.queue.length)
  const best = picks[0]
  if (!best) {
    return (
      <Shell tone="gray">
        <Line emoji="🙏" title={t('MyTurn.allFull')} sub={t('MyTurn.allFullHint')} />
      </Shell>
    )
  }
  return (
    <Shell tone="pink">
      <Line
        emoji="✨"
        title={t('MyTurn.bestIs', { court: courtTitle(best.court, t) })}
        sub={best.seat !== null ? t('MyTurn.freeNow') : best.wait <= 1 ? t('MyTurn.anyMoment') : t('MyTurn.aboutMins', { n: best.wait })}
      />
      <button
        onClick={() => (best.seat !== null ? onJoinPlaying(best.court.court_id, best.seat) : onJoinQueue(best.court.court_id))}
        disabled={busy}
        className="shrink-0 rounded-2xl bg-white px-4 py-2.5 text-sm font-extrabold text-pink-500 shadow-sm active:scale-95 transition-transform disabled:opacity-50"
      >
        {best.seat !== null ? t('MyTurn.playHere') : t('MyTurn.queueHere')}
      </button>
    </Shell>
  )
}

const TONES = {
  mint: 'from-emerald-400 to-emerald-500 text-white',
  yellow: 'from-amber-200 to-brand-yellow text-amber-900',
  pink: 'from-pink-300 to-pink-400 text-white',
  lavender: 'from-violet-200 to-brand-lavender text-violet-900',
  gray: 'from-gray-100 to-gray-200 text-gray-600',
}

// 外框是一般區塊;「點了捲到那一場」是左邊文字區自己的按鈕,右邊的動作鈕(投票/上場)是另一顆 —— 不能按鈕包按鈕
function Shell({ tone, children, onClick }: { tone: keyof typeof TONES; children: React.ReactNode; onClick?: () => void }) {
  return (
    <div className={`w-full rounded-3xl bg-gradient-to-br ${TONES[tone]} px-4 py-3 shadow-md flex items-center gap-3`}>
      {onClick ? <JumpArea onClick={onClick}>{children}</JumpArea> : children}
    </div>
  )
}

// 把 Shell 的子元素分成「說明文字」與「動作鈕」:說明文字包進可點的區塊,動作鈕留在外面
function JumpArea({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children]
  const [line, ...actions] = items
  return (
    <>
      <button onClick={onClick} className="min-w-0 flex-1 flex items-center gap-3 text-left active:opacity-80">
        {line}
      </button>
      {actions}
    </>
  )
}

function Line({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <>
      <span className="text-3xl shrink-0">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold text-[17px] leading-tight truncate">{title}</span>
        <span className="block text-xs font-semibold opacity-80 mt-0.5">{sub}</span>
      </span>
    </>
  )
}
