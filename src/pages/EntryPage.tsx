import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { sessionApi } from '../api/client'
import type { SessionPlayer } from '../api/client'
import { useSessionPlayers } from '../hooks/useSession'
import { LevelPicker } from '../components/LevelPicker'
import { tierOf } from '../lib/levels'

export function EntryPage() {
  const [params] = useSearchParams()
  const sessionId = params.get('s') ?? ''
  const nav = useNavigate()

  const [step, setStep] = useState<'password' | 'pick'>('password')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [level, setLevel] = useState(0)
  const [showManual, setShowManual] = useState(false)

  const { data: players } = useSessionPlayers(step === 'pick' ? sessionId : '')

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim() || !sessionId) return
    setStep('pick')
  }

  // join either as an existing roster player (isTemp=false) or a brand-new name (isTemp=true)
  async function join(displayName: string, isTemp: boolean) {
    if (!displayName.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await sessionApi.join(sessionId, password, displayName.trim(), level, isTemp)
      const { player_id } = res.data.data
      localStorage.setItem('player_id', player_id)
      localStorage.setItem('display_name', displayName.trim())
      nav(`/court/${sessionId}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? '加入失敗,請確認密碼正確')
    } finally {
      setLoading(false)
    }
  }

  const typed = name.trim()
  const roster = players ?? []
  // manual entry is the fallback: auto-open only when there's no list to pick from
  const manualOpen = showManual || roster.length === 0

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg p-6">
        <div className="card text-center">
          <div className="text-4xl mb-3">🏸</div>
          <p className="text-gray-500">請掃描 QR Code 進入球場</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🏸</div>
          <h1 className="text-2xl font-extrabold text-gray-800">加入球場</h1>
          <p className="text-gray-400 text-sm mt-1">輸入密碼 → 打上你的名字</p>
        </div>

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="card space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-gray-600">場地密碼</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="輸入密碼"
                className="mt-1 w-full border-2 border-gray-200 rounded-2xl px-4 py-3
                  focus:outline-none focus:border-brand-pink text-center text-lg font-bold"
                autoFocus
              />
            </label>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button type="submit" disabled={!password.trim()} className="btn-primary w-full">
              進入 →
            </button>
          </form>
        )}

        {step === 'pick' && (
          <div className="card space-y-4">
            <p className="font-bold text-gray-700 text-center">你是哪位?</p>

            {/* 1. pick your name from the list first */}
            {roster.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">點選你的名字</p>
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {roster.map((p: SessionPlayer) => {
                    const t = tierOf(p.level)
                    return (
                      <button
                        key={p.player_id}
                        onClick={() => join(p.display_name, false)}
                        disabled={loading}
                        className="w-full text-left px-4 py-3 rounded-2xl bg-gray-50
                          hover:bg-brand-pink hover:text-white font-semibold transition-colors
                          flex items-center justify-between gap-2"
                      >
                        <span>{p.display_name}</span>
                        {p.level > 0 && t && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${t.chip}`}>
                            {t.name} {p.level}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 2. fallback: only if your name really isn't in the list */}
            {manualOpen ? (
              <div className="space-y-3 border-t pt-3">
                {roster.length > 0 && (
                  <p className="text-xs text-gray-400">找不到自己?自己加入</p>
                )}
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="輸入你的名字"
                  autoFocus={roster.length === 0}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3
                    focus:outline-none focus:border-brand-pink text-center text-lg font-bold"
                />
                <LevelPicker value={level} onChange={setLevel} />
                <button
                  onClick={() => join(typed, true)}
                  disabled={!typed || loading}
                  className="btn-primary w-full"
                >
                  {loading ? '加入中...' : typed ? `用「${typed}」加入 →` : '輸入名字加入'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowManual(true)}
                className="btn-secondary w-full text-sm"
              >
                找不到自己?自己加入 →
              </button>
            )}

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
