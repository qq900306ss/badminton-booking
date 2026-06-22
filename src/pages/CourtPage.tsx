import { useParams } from 'react-router-dom'
import { useSessionView, useCourtActions } from '../hooks/useSession'
import { CourtCard } from '../components/CourtCard'

export function CourtPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const myPlayerId = localStorage.getItem('player_id')
  const myName = localStorage.getItem('display_name') ?? ''

  const { data: session, isLoading } = useSessionView(sessionId ?? '')
  const { joinPlaying, joinQueue, leaveQueue } = useCourtActions(sessionId ?? '')

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

      {/* courts grid */}
      <div className="p-4 grid gap-4 sm:grid-cols-2">
        {session.courts.map((court) => (
          <CourtCard
            key={court.court_id}
            court={court}
            myPlayerId={myPlayerId}
            onJoinPlaying={() => joinPlaying.mutate(court.court_id)}
            onJoinQueue={() => joinQueue.mutate(court.court_id)}
            onLeaveQueue={() => leaveQueue.mutate(court.court_id)}
          />
        ))}
      </div>

      {/* refresh hint */}
      <p className="text-center text-xs text-gray-300 pb-6">每 3 秒自動更新</p>
    </div>
  )
}
