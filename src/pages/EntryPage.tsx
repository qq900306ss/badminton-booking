import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { sessionApi } from '../api/client'
import type { SessionPlayer } from '../api/client'
import { useSessionPlayers } from '../hooks/useSession'

export function EntryPage() {
  const [params] = useSearchParams()
  const sessionId = params.get('s') ?? ''
  const nav = useNavigate()

  const [step, setStep] = useState<'password' | 'pick'>('password')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')

  const { data: players } = useSessionPlayers(step === 'pick' ? sessionId : '')

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim() || !sessionId) return
    setLoading(true)
    setError('')
    try {
      // just verify password by doing a dummy join with empty name to check
      // actually we verify on name pick, store password in state
      setStep('pick')
    } catch {
      setError('密碼錯誤,請再試一次')
    } finally {
      setLoading(false)
    }
  }

  async function pickPlayer(p: SessionPlayer) {
    setLoading(true)
    setError('')
    try {
      const res = await sessionApi.join(sessionId, password, p.display_name, false)
      const { player_id } = res.data.data
      localStorage.setItem('player_id', player_id)
      localStorage.setItem('display_name', p.display_name)
      nav(`/court/${sessionId}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? '加入失敗,請確認密碼正確')
    } finally {
      setLoading(false)
    }
  }

  async function addNewPlayer() {
    if (!newName.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await sessionApi.join(sessionId, password, newName.trim(), true)
      const { player_id } = res.data.data
      localStorage.setItem('player_id', player_id)
      localStorage.setItem('display_name', newName.trim())
      nav(`/court/${sessionId}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? '加入失敗')
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

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🏸</div>
          <h1 className="text-2xl font-extrabold text-gray-800">加入球場</h1>
          <p className="text-gray-400 text-sm mt-1">輸入密碼 → 選你的身份</p>
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
            <button type="submit" disabled={loading || !password.trim()} className="btn-primary w-full">
              {loading ? '驗證中...' : '進入 →'}
            </button>
          </form>
        )}

        {step === 'pick' && (
          <div className="card space-y-4">
            <p className="font-bold text-gray-700 text-center">你是哪位?</p>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋名字..."
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-2
                focus:outline-none focus:border-brand-pink text-sm"
            />
            <div className="max-h-52 overflow-y-auto space-y-2">
              {(players ?? [])
                .filter((p) => p.display_name.includes(search))
                .map((p) => (
                  <button
                    key={p.player_id}
                    onClick={() => pickPlayer(p)}
                    disabled={loading}
                    className="w-full text-left px-4 py-3 rounded-2xl bg-gray-50
                      hover:bg-brand-pink hover:text-white font-semibold transition-colors"
                  >
                    {p.display_name}
                  </button>
                ))}
            </div>

            <div className="border-t pt-3">
              <p className="text-xs text-gray-400 mb-2">名字不在列表上?</p>
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="輸入名字"
                  className="flex-1 border-2 border-gray-200 rounded-2xl px-3 py-2
                    focus:outline-none focus:border-brand-pink text-sm"
                />
                <button onClick={addNewPlayer} disabled={loading || !newName.trim()}
                  className="btn-primary px-4 text-sm">
                  加入
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
