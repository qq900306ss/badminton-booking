import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { playerApi } from '../api/client'
import { setAuth, consumeOAuthState, isAppOAuthState } from '../lib/playerAuth'
import { isIOSApp } from '../lib/native'

// iOS App 的 Google / LINE 登入跑在系統登入視窗(Safari)裡,回跳到這頁時要把 code/state
// 原封不動丟回 app;app 會在自己的 WebView 重開這頁,用 app 那邊存的 nonce 驗 state 再換 token
// (code 只能用一次,所以這邊絕對不能先換)。錯誤回跳(使用者在授權頁按取消)也一起丟回去。
function appReturnUrl(): string {
  return `badmintontw://oauth${window.location.pathname}${window.location.search}`
}

// handles the OAuth redirect back from Google / LINE: exchange the code for a
// player token, store it, then resume wherever the user was (the `state` param).
export function AuthCallback({ provider }: { provider: 'google' | 'line' }) {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [toApp, setToApp] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return // guard React 18 double-invoke (code is single-use)
    ran.current = true

    const code = params.get('code')
    const stateRaw = params.get('state') || ''
    if (!isIOSApp && isAppOAuthState(stateRaw)) {
      setToApp(true)
      window.location.replace(appReturnUrl())
      return
    }
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
        // 停權帳號:後端回 403「帳號已停權」→ 照語言顯示完整說明(含聯絡方式)
        setError(msg === '帳號已停權' ? t('AuthCallback.banned') : msg ?? t('AuthCallback.loginFailedRetry'))
      })
  }, [params, provider, nav, t])

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 text-center">
      {toApp ? (
        // 自動轉跳通常就直接關掉登入視窗了;從 LINE app 繞回 Safari 的情況 Safari 會先問要不要開 app,
        // 使用者按掉的話還有這顆鈕
        <div className="card space-y-3 max-w-xs">
          <div className="text-4xl animate-bounce">🏸</div>
          <p className="font-bold text-gray-600">{t('AuthCallback.returningToApp')}</p>
          <a href={appReturnUrl()} className="btn-primary block w-full">
            {t('AuthCallback.openApp')}
          </a>
        </div>
      ) : error ? (
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
