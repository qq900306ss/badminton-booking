import { motion, AnimatePresence } from 'framer-motion'
import type { CourtView, PlayerSlot } from '../api/client'
import { tierOf } from '../lib/levels'

const PALETTE = [
  'bg-brand-pink', 'bg-brand-mint', 'bg-brand-yellow',
  'bg-brand-peach', 'bg-brand-lavender',
  'bg-purple-200', 'bg-blue-200', 'bg-teal-200',
]
function fallbackColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function elapsedMins(startedAt?: string): number | null {
  if (!startedAt) return null
  const ms = Date.now() - new Date(startedAt).getTime()
  if (ms < 0) return null
  return Math.floor(ms / 60000)
}

function Avatar({ slot }: { slot: PlayerSlot }) {
  const initial = slot.display_name?.[0]?.toUpperCase() ?? '?'
  const tier = tierOf(slot.level)
  const bg = tier ? tier.avatarBg : fallbackColor(slot.player_id)
  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className="flex flex-col items-center gap-1"
    >
      <div className="relative">
        <div className={`w-11 h-11 rounded-full ${bg} flex items-center justify-center
          text-base font-extrabold text-white shadow-md ring-2 ring-white`}>
          {initial}
        </div>
        {slot.level > 0 && (
          <span className="absolute -top-1 -right-1 bg-white text-gray-700 text-[10px] font-bold
            rounded-full w-5 h-5 flex items-center justify-center shadow border border-gray-100">
            {slot.level}
          </span>
        )}
      </div>
      <span className="text-xs font-semibold text-gray-700 max-w-[4rem] truncate">
        {slot.display_name}
      </span>
    </motion.div>
  )
}

function EmptySlot({ canJoin, onJoin }: { canJoin: boolean; onJoin: () => void }) {
  if (canJoin) {
    return (
      <button
        onClick={onJoin}
        className="w-11 h-11 rounded-full border-2 border-dashed border-brand-pink/70 text-brand-pink
          flex items-center justify-center text-xl font-bold bg-white/40
          hover:bg-brand-pink hover:text-white active:scale-90 transition-all"
        aria-label="加入這個位置"
      >
        +
      </button>
    )
  }
  return (
    <div className="w-11 h-11 rounded-full border-2 border-dashed border-white/70 bg-white/20" />
  )
}

interface Props {
  court: CourtView
  myPlayerId: string | null
  locked?: boolean
  onJoinPlaying: () => void
  onJoinQueue: () => void
  onLeaveQueue: () => void
}

export function CourtCard({ court, myPlayerId, locked = false, onJoinPlaying, onJoinQueue, onLeaveQueue }: Props) {
  const imPlaying = court.playing.some((p) => p.player_id === myPlayerId)
  const imQueued = court.queue.some((p) => p.player_id === myPlayerId)
  const hasSpace = court.playing.length < 4
  const canJoinPlaying = !locked && !imPlaying && !imQueued && hasSpace
  const canJoinQueue = !locked && !imPlaying && !imQueued && !hasSpace && court.queue.length < 4

  const mins = elapsedMins(court.started_at)
  // four fixed positions; top two = one side, bottom two = the other side
  const slots = [court.playing[0], court.playing[1], court.playing[2], court.playing[3]]

  return (
    <div className="card relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="font-extrabold text-gray-700">場地 {court.court_num}</span>
        {court.status === 'playing' ? (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-mint text-emerald-700">
            進行中{mins !== null ? ` · 已打 ${mins} 分` : ''}
          </span>
        ) : (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">空場</span>
        )}
      </div>

      {/* badminton court */}
      <div className="relative rounded-2xl bg-gradient-to-b from-emerald-200/70 to-emerald-100/70 p-3 mb-3">
        {/* boundary */}
        <div className="absolute inset-3 rounded-lg border-2 border-white/80" />
        {/* net (center) */}
        <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white" />
        {/* singles side lines */}
        <div className="absolute top-3 bottom-3 left-[22%] border-l border-white/40" />
        <div className="absolute top-3 bottom-3 right-[22%] border-r border-white/40" />

        <div className="relative grid grid-cols-2 gap-y-3 place-items-center py-2">
          <AnimatePresence mode="popLayout">
            {slots.map((slot, i) =>
              slot ? (
                <Avatar key={slot.player_id} slot={slot} />
              ) : (
                <EmptySlot key={`empty-${i}`} canJoin={canJoinPlaying} onJoin={onJoinPlaying} />
              )
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* queue */}
      {court.queue.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-gray-400 font-semibold">排隊</span>
          {court.queue.map((p) => (
            <motion.div key={p.player_id} animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}>
              <Avatar slot={p} />
            </motion.div>
          ))}
        </div>
      )}

      {/* actions */}
      {imPlaying && <div className="text-center text-sm font-bold text-emerald-600 py-1">⚡ 你在場上打!</div>}
      {imQueued && (
        <button onClick={onLeaveQueue} className="btn-secondary w-full text-sm">退出排隊</button>
      )}
      {canJoinPlaying && (
        <p className="text-center text-xs text-brand-pink font-semibold">👆 點上面的空位加入</p>
      )}
      {canJoinQueue && (
        <button onClick={onJoinQueue} className="btn-secondary w-full text-sm">排隊等待</button>
      )}
      {locked && !imPlaying && !imQueued && (
        <p className="text-center text-xs text-gray-300">尚未開放排隊</p>
      )}
    </div>
  )
}
