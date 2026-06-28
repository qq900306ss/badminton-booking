import { useState } from 'react'
import type { SessionPlayer } from '../api/client'
import { LevelPicker } from './LevelPicker'
import { AVATAR_EMOJIS, isPhotoUrl } from '../lib/avatar'

interface Props {
  meId: string | null
  meName: string
  family: SessionPlayer[]
  activeId: string | null
  onSwitch: (id: string | null) => void
  onAdd: (name: string, level: number, avatar: string) => void
  onRemove: (playerId: string) => void
  adding: boolean
}

// small avatar shown on a family chip (emoji or photo, falls back to first letter)
function ChipAvatar({ p }: { p: SessionPlayer }) {
  if (isPhotoUrl(p.avatar_url))
    return <img src={p.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
  if (p.avatar_url) return <span className="text-sm leading-none">{p.avatar_url}</span>
  return <span>👪</span>
}

const chipCls = (active: boolean) =>
  `px-3 py-1 rounded-full text-sm font-bold transition-colors ${
    active ? 'bg-brand-pink text-white' : 'bg-white text-gray-600 border-2 border-gray-200'
  }`

// 家人共用手機:在球場頁上方切換「現在幫誰操作」,並可帶家人(待團主核准)。
export function FamilyBar({ meId, meName, family, activeId, onSwitch, onAdd, onRemove, adding }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [level, setLevel] = useState(0)
  const [avatar, setAvatar] = useState('🦊')

  function submit() {
    const n = name.trim()
    if (!n) return
    onAdd(n, level, avatar)
    setName('')
    setLevel(0)
    setAvatar('🦊')
    setOpen(false)
  }

  return (
    <div className="mx-4 mt-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-semibold">操作中</span>

        <button onClick={() => onSwitch(meId)} className={chipCls(activeId === meId)}>
          👤 {meName}
        </button>

        {family.map((f) => (
          <span key={f.player_id} className="relative inline-flex">
            <button
              disabled={f.pending}
              onClick={() => onSwitch(f.player_id)}
              className={`${chipCls(activeId === f.player_id)} ${f.pending ? 'opacity-60' : ''} inline-flex items-center gap-1`}
            >
              <ChipAvatar p={f} />
              {f.display_name}
              {f.pending && <span className="text-[10px] text-orange-500 ml-1">待核准</span>}
            </button>
            <button
              onClick={() => onRemove(f.player_id)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-300 text-white
                text-[10px] font-bold flex items-center justify-center"
              aria-label="移除家人"
            >
              ×
            </button>
          </span>
        ))}

        <button
          onClick={() => setOpen((o) => !o)}
          className="text-xs font-bold text-brand-pink border-2 border-dashed border-brand-pink/50
            rounded-full px-3 py-1"
        >
          ＋帶家人
        </button>
      </div>

      {open && (
        <div className="card mt-2 space-y-2">
          <p className="text-xs text-gray-500 font-semibold">帶一位家人(共用這支手機,需團主核准)</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="家人的名字"
            className="w-full border-2 border-gray-200 rounded-2xl px-3 py-2 text-sm
              focus:outline-none focus:border-brand-pink"
          />
          {/* 可愛頭像 */}
          <div>
            <span className="text-xs font-bold text-gray-500">選個頭像</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {AVATAR_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setAvatar(e)}
                  className={`w-8 h-8 rounded-full text-lg flex items-center justify-center ${
                    avatar === e ? 'bg-brand-pink/20 ring-2 ring-brand-pink' : 'bg-gray-50'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <LevelPicker value={level} onChange={setLevel} />
          <button
            onClick={submit}
            disabled={!name.trim() || adding}
            className="btn-primary w-full text-sm disabled:opacity-40"
          >
            {adding ? '送出中...' : '加入(等團主核准)'}
          </button>
        </div>
      )}

      {activeId !== meId && (
        <p className="text-[11px] text-violet-500 mt-1">
          👪 正在幫家人操作中 — 上下場/排隊都會記在他名下
        </p>
      )}
    </div>
  )
}
