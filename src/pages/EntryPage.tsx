import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { sessionApi } from '../api/client'
import { LevelPicker } from '../components/LevelPicker'
import { requestNotify } from '../lib/alert'
import { isLoggedIn, getAccount } from '../lib/playerAuth'
import { LoginScreen } from '../components/LoginScreen'

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
  const [name, setName] = useState(
    () => getAccount()?.join_name || getAccount()?.display_name || ''
  )
  const [level, setLevel] = useState(() => getAccount()?.default_level || 0)

  // already joined this session? verify the identity still exists, THEN go to the
  // court. if the leader removed it, clear it and let them re-pick.
  useEffect(() => {
    if (!sessionId) return
    const saved = localStorage.getItem(idKey(sessionId))
    if (!saved) return
    const { player_id, display_name } = JSON.parse(saved)
    sessionApi
      .getPlayers(sessionId)
      .then((r) => {
        if (r.data.data.some((p) => p.player_id === player_id)) {
          localStorage.setItem('player_id', player_id)
          localStorage.setItem('display_name', display_name)
          nav(`/court/${sessionId}`, { replace: true })
        } else {
          localStorage.removeItem(idKey(sessionId)) // 被移出 → 清掉,重新選
        }
      })
      .catch(() => {
        // network hiccup — fall back to going in with the stored identity
        localStorage.setItem('player_id', player_id)
        localStorage.setItem('display_name', display_name)
        nav(`/court/${sessionId}`, { replace: true })
      })
  }, [sessionId, nav])

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
    const n = name.trim()
    if (!n) {
      setError('請輸入名字')
      return
    }
    requestNotify() // 趁這個使用者點擊,順便要通知權限(輪到你了會用到)
    setLoading(true)
    setError('')
    try {
      const res = await sessionApi.join(sessionId, password, n, level)
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

  // mandatory login: must have an account before joining a session
  if (!isLoggedIn()) {
    return <LoginScreen title="登入後加入這場" />
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

        {/* step 2: confirm name + level (pre-filled from your account) */}
        {step === 'pick' && (
          <div className="card space-y-4">
            <div>
              <span className="text-sm font-bold text-gray-600">你的名字</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="輸入你的名字"
                autoFocus
                className="mt-1 w-full border-2 border-gray-200 rounded-2xl px-4 py-3
                  focus:outline-none focus:border-brand-pink text-center text-lg font-bold"
              />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-600">程度</span>
              <LevelPicker value={level} onChange={setLevel} />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button onClick={confirmJoin} disabled={loading || !name.trim()} className="btn-primary w-full">
              {loading ? '加入中...' : '進入球場 →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
