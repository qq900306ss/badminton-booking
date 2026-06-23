import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { sessionApi } from '../api/client'
import type { SessionPlayer } from '../api/client'
import { useSessionPlayers } from '../hooks/useSession'
import { LevelPicker } from '../components/LevelPicker'
import { tierOf } from '../lib/levels'
import { requestNotify } from '../lib/alert'

// per-session identity, so back-button can't re-pick / orphan a claimed name
const idKey = (sid: string) => `badminton_${sid}`

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
  const [chosen, setChosen] = useState<{ name: string; isTemp: boolean } | null>(null)

  // already joined this session? go straight to the court, no re-picking
  useEffect(() => {
    if (!sessionId) return
    const saved = localStorage.getItem(idKey(sessionId))
    if (saved) {
      const { player_id, display_name } = JSON.parse(saved)
      localStorage.setItem('player_id', player_id)
      localStorage.setItem('display_name', display_name)
      nav(`/court/${sessionId}`, { replace: true })
    }
  }, [sessionId, nav])

  const { data: players } = useSessionPlayers(step === 'pick' ? sessionId : '')

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim() || !sessionId) return
    setLoading(true)
    setError('')
    try {
      await sessionApi.verifyPassword(sessionId, password)
      setStep('pick')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setError(status === 401 ? '密碼錯誤,請再試一次' : status === 410 ? '這場已結束' : '無法驗證,請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  async function confirmJoin() {
    if (!chosen) return
    requestNotify() // 趁這個使用者點擊,順便要通知權限(輪到你了會用到)
    setLoading(true)
    setError('')
    try {
      const res = await sessionApi.join(sessionId, password, chosen.name, level, chosen.isTemp)
      const { player_id, display_name } = res.data.data
      localStorage.setItem(idKey(sessionId), JSON.stringify({ player_id, display_name }))
      localStorage.setItem('player_id', player_id)
      localStorage.setItem('display_name', display_name)
      nav(`/court/${sessionId}`, { replace: true })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(status === 401 ? '密碼錯誤' : msg ?? '加入失敗')
    } finally {
      setLoading(false)
    }
  }

  const typed = name.trim()
  const roster = players ?? []
  const available = roster.filter((p) => !p.claimed) // hide already-taken names
  const manualOpen = showManual || available.length === 0

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
          <p className="text-gray-400 text-sm mt-1">輸入密碼 → 選身份 → 選程度</p>
        </div>

        {/* step 1: password */}
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
            <button type="submit" disabled={!password.trim() || loading} className="btn-primary w-full">
              {loading ? '驗證中...' : '進入 →'}
            </button>
          </form>
        )}

        {/* step 2a: choose identity */}
        {step === 'pick' && !chosen && (
          <div className="card space-y-4">
            <p className="font-bold text-gray-700 text-center">你是哪位?</p>

            {available.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">點選你的名字</p>
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {available.map((p: SessionPlayer) => {
                    const t = tierOf(p.level)
                    return (
                      <button
                        key={p.player_id}
                        onClick={() => {
                          setLevel(p.level || 0)
                          setChosen({ name: p.display_name, isTemp: false })
                        }}
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

            {manualOpen ? (
              <div className="space-y-3 border-t pt-3">
                {available.length > 0 && <p className="text-xs text-gray-400">找不到自己?自己加入</p>}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="輸入你的名字"
                    autoFocus={available.length === 0}
                    className="flex-1 border-2 border-gray-200 rounded-2xl px-4 py-3
                      focus:outline-none focus:border-brand-pink font-bold"
                  />
                  <button
                    onClick={() => {
                      setLevel(0)
                      setChosen({ name: typed, isTemp: true })
                    }}
                    disabled={!typed}
                    className="btn-primary px-4"
                  >
                    下一步
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowManual(true)} className="btn-secondary w-full text-sm">
                找不到自己?自己加入 →
              </button>
            )}

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        )}

        {/* step 2b: confirm identity + pick level */}
        {step === 'pick' && chosen && (
          <div className="card space-y-4">
            <p className="text-center text-gray-600">
              你是 <span className="font-extrabold text-gray-800 text-lg">{chosen.name}</span> 🏸
            </p>
            <LevelPicker value={level} onChange={setLevel} />
            <button onClick={confirmJoin} disabled={loading} className="btn-primary w-full">
              {loading ? '加入中...' : '進入球場 →'}
            </button>
            <button
              onClick={() => {
                setChosen(null)
                setName('')
                setError('')
              }}
              className="w-full text-sm text-gray-400"
            >
              ← 重新選
            </button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
