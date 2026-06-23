import { motion } from 'framer-motion'
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
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
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
  // same flex-col + name-line height as Avatar, so swapping doesn't shift layout
  return (
    <div className="flex flex-col items-center gap-1">
      {canJoin ? (
        <button
          onClick={onJoin}
          className="w-11 h-11 rounded-full border-2 border-dashed border-brand-pink/70 text-brand-pink
            flex items-center justify-center text-xl font-bold bg-white/40
            hover:bg-brand-pink hover:text-white active:scale-90 transition-all"
          aria-label="加入這個位置"
        >
          +
        </button>
      ) : (
        <div className="w-11 h-11 rounded-full border-2 border-dashed border-white/70 bg-white/20" />
      )}
      <span className="text-xs">&nbsp;</span>
    </div>
  )
}

interface Props {
  court: CourtView
  myPlayerId: string | null
  locked?: boolean
  inAnotherCourt?: boolean
  onJoinPlaying: (position: number) => void
  onJoinQueue: () => void
  onLeaveQueue: () => void
  onLeavePlaying: () => void
}

export function CourtCard({ court, myPlayerId, locked = false, inAnotherCourt = false, onJoinPlaying, onJoinQueue, onLeaveQueue, onLeavePlaying }: Props) {
  // playing is a fixed 4-slot array; empty slots have player_id === ''
  const slots = court.playing
  const filled = slots.filter((p) => p.player_id).length
  const imPlaying = slots.some((p) => p.player_id === myPlayerId)
  const imQueued = court.queue.some((p) => p.player_id === myPlayerId)
  const full = filled === 4
  // empty slot tappable: to join (not in any court) or to move (already playing here)
  const canPlace = !locked && !inAnotherCourt && !imQueued && filled < 4
  // a player may choose to queue at any time, even when slots are open
  const canJoinQueue = !locked && !inAnotherCourt && !imPlaying && !imQueued && court.queue.length < 4
  const mins = elapsedMins(court.started_at)

  return (
    <div className="card relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="font-extrabold text-gray-700">{court.name?.trim() ? court.name : `場地 ${court.court_num}`}</span>
        {filled === 0 ? (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">空場</span>
        ) : full ? (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-mint text-emerald-700">
            進行中{mins !== null ? ` · 已打 ${mins} 分` : ''}
          </span>
        ) : (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-yellow text-amber-700">
            湊人中 {filled}/4
          </span>
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

        {/* fixed 2×2 grid — each cell keeps its place regardless of content */}
        <div className="relative grid grid-cols-2 gap-y-3 py-2">
          {slots.map((slot, i) => (
            <div key={i} className="h-16 flex items-center justify-center">
              {slot.player_id ? (
                <Avatar slot={slot} />
              ) : (
                <EmptySlot canJoin={canPlace} onJoin={() => onJoinPlaying(i)} />
              )}
            </div>
          ))}
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
      {imPlaying && full && (
        <div className="text-center text-sm font-bold text-emerald-600 py-1">⚡ 你在場上打!</div>
      )}
      {imPlaying && !full && (
        <div className="space-y-1.5">
          <p className="text-center text-xs text-amber-600 font-semibold">👆 點其他空位可換位置 · 等湊滿 4 人開打</p>
          <button onClick={onLeavePlaying} className="btn-secondary w-full text-sm">離開場地(換場)</button>
        </div>
      )}
      {imQueued && (
        <button onClick={onLeaveQueue} className="btn-secondary w-full text-sm">退出排隊(場地 {court.court_num})</button>
      )}
      {!imPlaying && !imQueued && inAnotherCourt && (
        <p className="text-center text-xs text-gray-300">你已在其他場地</p>
      )}
      {!imPlaying && !imQueued && !inAnotherCourt && locked && (
        <p className="text-center text-xs text-gray-300">尚未開放</p>
      )}
      {canPlace && !imPlaying && (
        <p className="text-center text-xs text-brand-pink font-semibold">👆 點空位直接上場</p>
      )}
      {canJoinQueue && (
        <button onClick={onJoinQueue} className="btn-secondary w-full text-sm">
          {full ? '排隊等待' : '我先排隊就好(不上場)'}
        </button>
      )}
    </div>
  )
}
