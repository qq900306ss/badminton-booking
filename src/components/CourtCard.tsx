import { motion, AnimatePresence } from 'framer-motion'
import type { CourtView, PlayerSlot } from '../api/client'

// deterministic pastel colour per player_id
const PALETTE = [
  'bg-brand-pink', 'bg-brand-mint', 'bg-brand-yellow',
  'bg-brand-peach', 'bg-brand-lavender',
  'bg-purple-200', 'bg-blue-200', 'bg-teal-200',
]
function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function Avatar({ slot }: { slot: PlayerSlot }) {
  const initial = slot.display_name?.[0]?.toUpperCase() ?? '?'
  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={`flex flex-col items-center gap-1`}
    >
      <div className={`w-12 h-12 rounded-full ${avatarColor(slot.player_id)}
        flex items-center justify-center text-lg font-extrabold text-white shadow`}>
        {initial}
      </div>
      <span className="text-xs font-semibold text-gray-600 max-w-[3.5rem] truncate">
        {slot.display_name}
      </span>
    </motion.div>
  )
}

function EmptySlot() {
  return (
    <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
      <span className="text-gray-300 text-xl">+</span>
    </div>
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
  const imQueued  = court.queue.some((p) => p.player_id === myPlayerId)
  const canJoinPlaying = !locked && !imPlaying && !imQueued && court.playing.length < 4
  const canJoinQueue   = !locked && !imPlaying && !imQueued && court.playing.length >= 4 && court.queue.length < 4

  // court diagram: top row = playing[0,1], bottom row = playing[2,3]
  const slots: (PlayerSlot | null)[] = [
    court.playing[0] ?? null,
    court.playing[1] ?? null,
    court.playing[2] ?? null,
    court.playing[3] ?? null,
  ]

  return (
    <div className="card relative overflow-hidden">
      {/* status badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-extrabold text-gray-700">場地 {court.court_num}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full
          ${court.status === 'playing' ? 'bg-brand-mint text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
          {court.status === 'playing' ? '進行中' : '空場'}
        </span>
      </div>

      {/* court diagram */}
      <div className="relative bg-emerald-50 rounded-2xl p-4 mb-3">
        {/* net line */}
        <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-emerald-200 -translate-y-1/2" />
        {/* court lines */}
        <div className="absolute inset-4 border-2 border-emerald-200 rounded-xl" />

        <div className="grid grid-cols-2 gap-2">
          <AnimatePresence mode="popLayout">
            {slots.slice(0, 2).map((slot, i) =>
              slot ? <Avatar key={slot.player_id} slot={slot} /> : <EmptySlot key={`empty-top-${i}`} />
            )}
          </AnimatePresence>
          <div className="col-span-2 h-2" /> {/* net spacer */}
          <AnimatePresence mode="popLayout">
            {slots.slice(2).map((slot, i) =>
              slot ? <Avatar key={slot.player_id} slot={slot} /> : <EmptySlot key={`empty-bot-${i}`} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* queue row */}
      {court.queue.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-gray-400 font-semibold">等待中</span>
          <AnimatePresence>
            {court.queue.map((p) => (
              <motion.div key={p.player_id}
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 2, delay: Math.random() }}
              >
                <Avatar slot={p} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* action buttons */}
      {imPlaying && (
        <div className="text-center text-sm font-bold text-emerald-600 py-1">⚡ 你在場上打!</div>
      )}
      {imQueued && (
        <button onClick={onLeaveQueue} className="btn-secondary w-full text-sm">
          退出排隊
        </button>
      )}
      {canJoinPlaying && (
        <button onClick={onJoinPlaying} className="btn-primary w-full text-sm">
          🏸 加入這場
        </button>
      )}
      {canJoinQueue && (
        <button onClick={onJoinQueue} className="btn-secondary w-full text-sm">
          排隊等待
        </button>
      )}
    </div>
  )
}
