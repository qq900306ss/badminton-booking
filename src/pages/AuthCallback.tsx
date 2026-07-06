import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { playerApi } from '../api/client'
import { setAuth, consumeOAuthState } from '../lib/playerAuth'

// handles the OAuth redirect back from Google / LINE: exchange the code for a
// player token, store it, then resume wherever the user was (the `state` param).
export function AuthCallback({ provider }: { provider: 'google' | 'line' }) {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return // guard React 18 double-invoke (code is single-use)
    ran.current = true

    const code = params.get('code')
    const stateRaw = params.get('state') || ''
    if (!code) {
      setError(t('AuthCallback.loginFailedNoCode'))
      return
    }
    // CSRF: the callback's state must match the nonce we stored before redirecting
    const back = consumeOAuthState(stateRaw)
    if (back === null) {
      setError(t('AuthCallback.loginFailedBadState'))
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
        setError(msg ?? t('AuthCallback.loginFailedRetry'))
      })
  }, [params, provider, nav, t])

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 text-center">
      {error ? (
        <div className="card space-y-3 max-w-xs">
          <div className="text-4xl">😵</div>
          <p className="font-bold text-gray-700">{error}</p>
          <button onClick={() => nav('/', { replace: true })} className="btn-primary w-full">
            {t('AuthCallback.backHome')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-4xl animate-bounce">🏸</div>
          <p className="font-bold text-gray-500">{t('AuthCallback.loggingIn')}</p>
        </div>
      )}
    </div>
  )
}
