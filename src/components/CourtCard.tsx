import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { CourtView, PlayerSlot } from '../api/client'
import { tierOf } from '../lib/levels'
import { isPhotoUrl } from '../lib/avatar'
import { useToast } from './Toast'

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

function Avatar({ slot, me = false }: { slot: PlayerSlot; me?: boolean }) {
  const { t } = useTranslation()
  // [...str][0] is emoji/surrogate-pair safe — str[0] splits a 🔥-style name into
  // a broken half (the "亂碼" in the circle).
  const initial = [...(slot.display_name ?? '')][0]?.toUpperCase() ?? '?'
  const tier = tierOf(slot.level)
  const bg = tier ? tier.avatarBg : fallbackColor(slot.player_id)
  const ring = me ? 'ring-4 ring-amber-400' : 'ring-2 ring-white'
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className="flex flex-col items-center gap-1"
    >
      <div className="relative">
        {isPhotoUrl(slot.avatar_url) ? (
          <img
            src={slot.avatar_url}
            alt={slot.display_name}
            className={`w-11 h-11 rounded-full object-cover shadow-md ${ring}`}
          />
        ) : (
          <div className={`w-11 h-11 rounded-full ${bg} flex items-center justify-center shadow-md ${ring}`}>
            {slot.avatar_url ? (
              <span className="text-xl">{slot.avatar_url}</span>
            ) : (
              <span className="text-base font-extrabold text-white">{initial}</span>
            )}
          </div>
        )}
        {slot.level > 0 && (
          <span className={`absolute -top-1 -right-1 ${tier ? tier.avatarBg : 'bg-gray-400'}
            text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center
            justify-center shadow border-2 border-white`}>
            {slot.level}
          </span>
        )}
        {me && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-[9px]
            font-bold rounded-full px-1.5 leading-4 shadow">
            {t('CourtCard.me')}
          </span>
        )}
      </div>
      <span className={`text-xs font-semibold max-w-[4rem] truncate ${me ? 'text-amber-600' : 'text-gray-700'}`}>
        {slot.display_name}
      </span>
    </motion.div>
  )
}

function EmptySlot({ canJoin, onJoin, locked = false, onLockedTap }: { canJoin: boolean; onJoin: () => void; locked?: boolean; onLockedTap?: () => void }) {
  const { t } = useTranslation()
  // same flex-col + name-line height as Avatar, so swapping doesn't shift layout
  return (
    <div className="flex flex-col items-center gap-1">
      {canJoin ? (
        <button
          onClick={onJoin}
          className="w-11 h-11 rounded-full border-2 border-dashed border-brand-pink/70 text-brand-pink
            flex items-center justify-center text-xl font-bold bg-white/40
            hover:bg-brand-pink hover:text-white active:scale-90 transition-all"
          aria-label={t('CourtCard.joinThisSlot')}
        >
          +
        </button>
      ) : locked ? (
        // 團主鎖定:看起來變灰不可用,但點下去仍解釋原因(跳提示),不靜默
        <button
          onClick={onLockedTap}
          className="w-11 h-11 rounded-full border-2 border-dashed border-gray-300 text-gray-300
            flex items-center justify-center text-base bg-white/20 active:scale-90 transition-all"
          aria-label={t('CourtCard.lockedByHost')}
        >
          🔒
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
  onVoteEnd: () => void
  votePending?: boolean
}

export function CourtCard({ court, myPlayerId, locked = false, inAnotherCourt = false, onJoinPlaying, onJoinQueue, onLeaveQueue, onLeavePlaying, onVoteEnd, votePending = false }: Props) {
  const { t } = useTranslation()
  const toast = useToast()
  // playing is a fixed 4-slot array; empty slots have player_id === ''
  const slots = court.playing
  const filled = slots.filter((p) => p.player_id).length
  const imPlaying = slots.some((p) => p.player_id === myPlayerId)
  const imQueued = court.queue.some((p) => p.player_id === myPlayerId)
  const full = filled === 4
  // 團主手動鎖定這個場地:擋所有玩家端自助上場/排隊(團主後台仍可排人)
  const courtLocked = !!court.locked
  // empty slot tappable: to join (not in any court) or to move (already playing here)
  const canPlace = !locked && !courtLocked && !inAnotherCourt && !imQueued && filled < 4
  // a player may choose to queue at any time, even when slots are open
  const canJoinQueue = !locked && !courtLocked && !inAnotherCourt && !imPlaying && !imQueued && court.queue.length < 4
  // 鎖定時空位/排隊改成「灰但可點 → 跳提示」(只對本來有機會加入的人)
  const showLockedAffordance = courtLocked && !imPlaying && !imQueued && !inAnotherCourt
  const notifyLocked = () => toast(t('CourtCard.lockedByHost'), 'error')
  const mins = elapsedMins(court.started_at)

  return (
    <div className={`card relative overflow-hidden ${courtLocked ? 'ring-2 ring-rose-200' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-extrabold text-gray-700">{court.name?.trim() ? court.name : t('CourtCard.courtLabel', { num: court.court_num })}</span>
        <div className="flex items-center gap-1.5">
          {courtLocked && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">🔒 {t('CourtCard.lockedBadge')}</span>
          )}
          {filled === 0 ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">{t('CourtCard.empty')}</span>
          ) : full ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-mint text-emerald-700">
              {t('CourtCard.playing')}{mins !== null ? t('CourtCard.elapsed', { mins }) : ''}
            </span>
          ) : (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-yellow text-amber-700">
              {t('CourtCard.filling', { filled })}
            </span>
          )}
        </div>
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
                <Avatar slot={slot} me={slot.player_id === myPlayerId} />
              ) : (
                <EmptySlot canJoin={canPlace} onJoin={() => onJoinPlaying(i)} locked={showLockedAffordance} onLockedTap={notifyLocked} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* queue */}
      {court.queue.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-gray-400 font-semibold">{t('CourtCard.queue')}</span>
          {court.queue.map((p) => (
            <motion.div key={p.player_id} animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}>
              <Avatar slot={p} me={p.player_id === myPlayerId} />
            </motion.div>
          ))}
        </div>
      )}

      {/* actions */}
      {imPlaying && full && (() => {
        const votes = court.end_votes ?? []
        const needed = court.end_votes_needed ?? 2
        const iVoted = myPlayerId ? votes.includes(myPlayerId) : false
        return (
          <div className="space-y-1.5">
            <div className="text-center text-sm font-bold text-emerald-600">{t('CourtCard.youArePlaying')}</div>
            <button
              onClick={onVoteEnd}
              disabled={votePending}
              className={`w-full text-sm rounded-2xl py-2 font-bold border-2 active:scale-95 transition-transform disabled:opacity-50 ${
                iVoted
                  ? 'bg-rose-50 border-rose-300 text-rose-500'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            >
              {iVoted
                ? t('CourtCard.votedEnd', { votes: votes.length, needed })
                : t('CourtCard.voteEnd', { votes: votes.length, needed })}
            </button>
            <p className="text-center text-[11px] text-gray-400">{t('CourtCard.voteHint', { needed })}</p>
          </div>
        )
      })()}
      {imPlaying && !full && (
        <div className="space-y-1.5">
          <p className="text-center text-xs text-amber-600 font-semibold">{t('CourtCard.moveHint')}</p>
          <button onClick={onLeavePlaying} className="btn-secondary w-full text-sm">{t('CourtCard.leaveCourt')}</button>
        </div>
      )}
      {imQueued && (
        <button onClick={onLeaveQueue} className="btn-secondary w-full text-sm">{t('CourtCard.leaveQueue', { num: court.court_num })}</button>
      )}
      {!imPlaying && !imQueued && inAnotherCourt && (
        <p className="text-center text-xs text-gray-300">{t('CourtCard.inAnotherCourt')}</p>
      )}
      {!imPlaying && !imQueued && !inAnotherCourt && courtLocked && (
        <button
          onClick={notifyLocked}
          className="w-full text-sm rounded-2xl py-2 font-bold bg-gray-100 text-gray-400 active:scale-95 transition-transform"
        >
          🔒 {t('CourtCard.lockedByHost')}
        </button>
      )}
      {!imPlaying && !imQueued && !inAnotherCourt && locked && !courtLocked && (
        <p className="text-center text-xs text-gray-300">{t('CourtCard.notOpen')}</p>
      )}
      {canPlace && !imPlaying && (
        <p className="text-center text-xs text-brand-pink font-semibold">{t('CourtCard.tapToPlay')}</p>
      )}
      {canJoinQueue && (
        <button onClick={onJoinQueue} className="btn-secondary w-full text-sm">
          {full ? t('CourtCard.waitInQueue') : t('CourtCard.queueOnly')}
        </button>
      )}
    </div>
  )
}
