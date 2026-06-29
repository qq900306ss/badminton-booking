import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { playerApi } from '../api/client'
import { setAuth, consumeOAuthState } from '../lib/playerAuth'

// handles the OAuth redirect back from Google / LINE: exchange the code for a
// player token, store it, then resume wherever the user was (the `state` param).
export function AuthCallback({ provider }: { provider: 'google' | 'line' }) {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [error, setError] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return // guard React 18 double-invoke (code is single-use)
    ran.current = true

    const code = params.get('code')
    const stateRaw = params.get('state') || ''
    if (!code) {
      setError('登入失敗:沒有收到授權碼')
      return
    }
    // CSRF: the callback's state must match the nonce we stored before redirecting
    const back = consumeOAuthState(stateRaw)
    if (back === null) {
      setError('登入失敗:安全驗證不符,請重新登入')
      return
    }

    const req = provider === 'google' ? playerApi.google(code) : playerApi.line(code)
    req
      .then((r) => {
        setAuth(r.data.data.token, r.data.data.player)
        nav(back, { replace: true })
      })
      .catch((e) => {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
        setError(msg ?? '登入失敗,請再試一次')
      })
  }, [params, provider, nav])

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 text-center">
      {error ? (
        <div className="card space-y-3 max-w-xs">
          <div className="text-4xl">😵</div>
          <p className="font-bold text-gray-700">{error}</p>
          <button onClick={() => nav('/', { replace: true })} className="btn-primary w-full">
            回首頁
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-4xl animate-bounce">🏸</div>
          <p className="font-bold text-gray-500">登入中…</p>
        </div>
      )}
    </div>
  )
}
