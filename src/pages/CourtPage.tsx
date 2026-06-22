import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionView, useCourtActions } from '../hooks/useSession'
import { CourtCard } from '../components/CourtCard'

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
  }, [sid]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: session, isLoading } = useSessionView(sessionId ?? '')
  const { joinPlaying, joinQueue, leaveQueue, leavePlaying } = useCourtActions(sessionId ?? '')

  // a player may only be in one court at a time
  const myCourtId =
    session?.courts.find(
      (c) =>
        c.playing.some((p) => p.player_id === myPlayerId) ||
        c.queue.some((p) => p.player_id === myPlayerId)
    )?.court_id ?? null

  // queue-open gate: before this time players can look but not join/queue
  const queueOpenAt = session?.queue_open_at ? new Date(session.queue_open_at) : null
  const locked = queueOpenAt ? new Date() < queueOpenAt : false
  const openTimeStr = queueOpenAt
    ? queueOpenAt.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
    : ''

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-4xl animate-bounce">🏸</div>
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
          <div className="w-8 h-8 rounded-full bg-brand-pink flex items-center justify-center
            text-white font-bold text-sm">
            {myName[0]?.toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-gray-600">{myName}</span>
        </div>
      </div>

      {/* session title */}
      {session.title && (
        <p className="text-center font-extrabold text-gray-700 pt-3">{session.title}</p>
      )}

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
            myPlayerId={myPlayerId}
            locked={locked}
            inAnotherCourt={myCourtId !== null && myCourtId !== court.court_id}
            onJoinPlaying={(position) => joinPlaying.mutate({ courtId: court.court_id, position })}
            onJoinQueue={() => joinQueue.mutate(court.court_id)}
            onLeaveQueue={() => leaveQueue.mutate(court.court_id)}
            onLeavePlaying={() => leavePlaying.mutate(court.court_id)}
          />
        ))}
      </div>

      {/* refresh hint */}
      <p className="text-center text-xs text-gray-300 pb-6">每 3 秒自動更新</p>
    </div>
  )
}
