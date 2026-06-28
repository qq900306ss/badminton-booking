import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useSessionView, useCourtActions, useSessionPlayers } from '../hooks/useSession'
import { CourtCard } from '../components/CourtCard'
import { FamilyBar } from '../components/FamilyBar'
import { CourtSkeleton } from '../components/Skeleton'
import { InstallButton } from '../components/InstallButton'
import { NotificationBell } from '../components/NotificationBell'
import { useToast } from '../components/Toast'
import { playChime, vibrate, notifyTurn, subscribePush } from '../lib/alert'
import { connectSessionWS } from '../lib/realtime'
import { pushNotif } from '../lib/notifications'
import { sessionApi } from '../api/client'

export function CourtPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const sid = sessionId ?? ''
  const nav = useNavigate()

  // identity is bound to this session; bounce to entry if not joined yet
  const saved = localStorage.getItem(`badminton_${sid}`)
  const identity = saved ? (JSON.parse(saved) as { player_id: string; display_name: string }) : null
  const myPlayerId = identity?.player_id ?? null
  const myName = identity?.display_name ?? ''

  useEffect(() => {
    if (!identity) {
      nav(`/?s=${sid}`, { replace: true })
      return
    }
    // keep the global id in sync for the X-Player-ID request header
    localStorage.setItem('player_id', identity.player_id)
    localStorage.setItem('display_name', identity.display_name)
    // register for Web Push so 「輪到你了」reaches you even with the app closed
    subscribePush(
      () => sessionApi.vapidKey().then((r) => r.data.data.public_key),
      (sub) => sessionApi.pushSubscribe(sid, sub)
    )
  }, [sid]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: session, isLoading } = useSessionView(sessionId ?? '')
  const { data: sessionPlayers, dataUpdatedAt: playersUpdatedAt } = useSessionPlayers(sid, true)
  const { joinPlaying, joinQueue, leaveQueue, leavePlaying, voteEnd, addFamily, removeFamily } =
    useCourtActions(sessionId ?? '')

  const toast = useToast()
  const qc = useQueryClient()

  // 家人共用手機:這支手機可代操作「我」+ 自己帶的(已核准)家人。activePlayerId =
  // 目前正在幫誰操作;送 court action 時若不是本人就帶 as_player。
  const [activePlayerId, setActivePlayerId] = useState<string | null>(myPlayerId)
  const myFamily = (sessionPlayers ?? []).filter((p) => p.owner_id === myPlayerId)
  const actingId = activePlayerId ?? myPlayerId
  const asPlayerArg = actingId === myPlayerId ? undefined : actingId ?? undefined
  // if the active family member was removed/rejected, fall back to myself.
  // depend on the actual data + current active id (no stale closure) so it
  // re-checks whenever the player list changes or the active identity switches.
  useEffect(() => {
    if (!activePlayerId || activePlayerId === myPlayerId) return
    const stillUsable = (sessionPlayers ?? []).some(
      (p) => p.player_id === activePlayerId && !p.pending
    )
    if (!stillUsable) setActivePlayerId(myPlayerId)
  }, [sessionPlayers, activePlayerId, myPlayerId])

  // real-time: WS nudge → refetch instantly; targeted "removed" → toast + log
  useEffect(() => {
    if (!sid) return
    return connectSessionWS(sid, (m) => {
      qc.invalidateQueries({ queryKey: ['session', sid] })
      qc.invalidateQueries({ queryKey: ['session-players', sid] })
      if ((m.t === 'removed' || m.t === 'renamed') && m.player === myPlayerId) {
        toast(m.msg, 'info')
        vibrate()
        pushNotif(m.msg)
      }
    })
  }, [sid, myPlayerId, qc, toast])

  // if the leader removed me from the session, boot me back to entry.
  // require 2 consecutive "absent" polls so DB eventual-consistency right after
  // joining doesn't falsely kick a fresh player.
  const absentCount = useRef(0)
  useEffect(() => {
    if (!sessionPlayers || !myPlayerId) return
    if (sessionPlayers.some((p) => p.player_id === myPlayerId)) {
      absentCount.current = 0
      return
    }
    absentCount.current += 1
    if (absentCount.current >= 2) {
      localStorage.removeItem(`badminton_${sid}`)
      toast('你已被移出本場,請重新選身份', 'info')
      nav(`/?s=${sid}`, { replace: true })
    }
    // depend on playersUpdatedAt so this runs on EVERY poll (React Query reuses
    // the array reference when data is unchanged, which would otherwise skip it)
  }, [playersUpdatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // a player may only be in one court at a time — computed for the ACTING identity
  // (me, or the family member I'm currently controlling)
  const myCourt =
    session?.courts.find(
      (c) =>
        c.playing.some((p) => p.player_id === actingId) ||
        c.queue.some((p) => p.player_id === actingId)
    ) ?? null
  const myCourtId = myCourt?.court_id ?? null
  const myState: 'playing' | 'queued' | 'none' = !myCourt
    ? 'none'
    : myCourt.playing.some((p) => p.player_id === actingId)
      ? 'playing'
      : 'queued'

  // current name from live data (reflects a leader rename), fallback to stored
  const displayName =
    sessionPlayers?.find((p) => p.player_id === myPlayerId)?.display_name || myName

  // alert when promoted from queue → playing (輪到你了)
  const prevState = useRef<typeof myState | null>(null)
  useEffect(() => {
    if (prevState.current === 'queued' && myState === 'playing') {
      const where = myCourt?.name?.trim() ? myCourt.name : `場地 ${myCourt?.court_num}`
      toast('🏸 輪到你上場了!', 'success')
      playChime()
      vibrate()
      pushNotif(`🏸 輪到你上場了(${where})`)
      if (document.hidden) notifyTurn(`${where} · 快回來上場`)
    }
    prevState.current = myState
  }, [myState, myCourt, toast])

  // queue-open gate: before this time players can look but not join/queue
  const queueOpenAt = session?.queue_open_at ? new Date(session.queue_open_at) : null
  const locked = queueOpenAt ? new Date() < queueOpenAt : false
  const openTimeStr = queueOpenAt
    ? queueOpenAt.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
    : ''

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg p-4">
        <CourtSkeleton />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="card text-center">
          <p className="text-gray-500">找不到這場球局</p>
        </div>
      </div>
    )
  }

  if (session.status === 'closed') {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="card text-center space-y-2">
          <div className="text-4xl">🎉</div>
          <p className="font-bold text-gray-700">這場球局已結束</p>
          <p className="text-gray-400 text-sm">感謝參與,下次再來!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* header */}
      <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => nav('/')}
            className="text-gray-400 hover:text-brand-pink text-lg font-bold px-1"
            aria-label="回大廳"
          >
            ←
          </button>
          <span className="text-2xl">🏸</span>
          <span className="font-extrabold text-gray-800">球場即時</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <div className="w-8 h-8 rounded-full bg-brand-pink flex items-center justify-center
            text-white font-bold text-sm">
            {[...displayName][0]?.toUpperCase() ?? '?'}
          </div>
          <span className="text-sm font-semibold text-gray-600">{displayName}</span>
        </div>
      </div>

      {/* session title */}
      {session.title && (
        <p className="text-center font-extrabold text-gray-700 pt-3">{session.title}</p>
      )}

      {/* 家人共用手機:身份切換 + 帶家人 */}
      <FamilyBar
        meId={myPlayerId}
        meName={displayName}
        family={myFamily}
        activeId={actingId}
        onSwitch={setActivePlayerId}
        onAdd={(name, level, avatar) => addFamily.mutate({ name, level, avatar })}
        onRemove={(playerId) => {
          if (playerId === activePlayerId) setActivePlayerId(myPlayerId) // don't keep acting as a removed member
          removeFamily.mutate(playerId)
        }}
        adding={addFamily.isPending}
      />

      {/* queue-open gate banner */}
      {locked && (
        <div className="mx-4 mt-3 bg-brand-yellow/60 rounded-2xl px-4 py-3 text-center">
          <p className="font-bold text-amber-700">⏰ 排隊 {openTimeStr} 開放</p>
          <p className="text-xs text-amber-600 mt-0.5">先看看球場狀況,時間到就能自己排上場囉</p>
        </div>
      )}

      {/* courts grid */}
      <div className="p-4 grid gap-4 sm:grid-cols-2">
        {session.courts.map((court) => (
          <CourtCard
            key={court.court_id}
            court={court}
            myPlayerId={actingId}
            locked={locked}
            inAnotherCourt={myCourtId !== null && myCourtId !== court.court_id}
            onJoinPlaying={(position) => joinPlaying.mutate({ courtId: court.court_id, position, asPlayer: asPlayerArg })}
            onJoinQueue={() => joinQueue.mutate({ courtId: court.court_id, asPlayer: asPlayerArg })}
            onLeaveQueue={() => leaveQueue.mutate({ courtId: court.court_id, asPlayer: asPlayerArg })}
            onLeavePlaying={() => leavePlaying.mutate({ courtId: court.court_id, asPlayer: asPlayerArg })}
            onVoteEnd={() => voteEnd.mutate({ courtId: court.court_id, asPlayer: asPlayerArg })}
          />
        ))}
      </div>

      {/* refresh hint */}
      <div className="max-w-md mx-auto px-4 pb-2">
        <InstallButton label="📲 裝到桌面 · 收「輪到你了」通知" />
      </div>
      <p className="text-center text-xs text-gray-300 pb-6">⚡ 即時更新(WebSocket)</p>
    </div>
  )
}
