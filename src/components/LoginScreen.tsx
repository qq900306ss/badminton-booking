import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { useState } from 'react'
import { isInAppBrowser, isLineInApp, lineExternalBrowserUrl, androidChromeIntentUrl } from '../lib/inAppBrowser'
import { isIOSApp } from '../lib/native'
import { hasBannedNotice } from '../lib/playerAuth'
import { LoginButtons } from './LoginButtons'

// shown when a not-logged-in player tries to join. Browsing stays public;
// joining/playing requires an account (Google or LINE; Apple too inside the iOS app).
export function LoginScreen({ title }: { title?: string }) {
  const { t } = useTranslation()
  const inApp = isInAppBrowser()
  const inLine = isLineInApp()
  const isAndroid = /android/i.test(navigator.userAgent || '')
  const [copied, setCopied] = useState(false)
  async function onCopy() {
    if (!(await copyText(window.location.href))) return
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const resolvedTitle = title ?? t('LoginScreen.defaultTitle')
  const banned = hasBannedNotice() // 剛因停權被登出(401 攔截器記的)
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-7">
        <div>
          <div className="text-5xl mb-2">🏸</div>
          <h1 className="text-2xl font-extrabold text-gray-800">{resolvedTitle}</h1>
          <p className="text-gray-400 text-sm mt-1">{t(isIOSApp ? 'LoginScreen.subtitleApp' : 'LoginScreen.subtitle')}</p>
        </div>

        {inApp && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 text-left space-y-2">
            <p className="text-sm font-bold text-amber-700">{t(inLine ? 'LoginScreen.inAppTitleLine' : 'LoginScreen.inAppTitle')}</p>
            <p className="text-xs text-amber-600">{t(inLine ? 'LoginScreen.inAppBodyLine' : 'LoginScreen.inAppBody')}</p>
            {/* LINE 官方參數:帶 openExternalBrowser=1 → LINE 改用系統瀏覽器開;Android 其他 App 用 Chrome intent */}
            {inLine ? (
              <a href={lineExternalBrowserUrl()} className="btn-secondary block text-center text-sm">
                {t('LoginScreen.openBrowser')}
              </a>
            ) : (
              isAndroid && (
                <a href={androidChromeIntentUrl()} className="btn-secondary block text-center text-sm">
                  {t('LoginScreen.openChrome')}
                </a>
              )
            )}
            <button
              onClick={onCopy}
              className="text-xs font-bold text-amber-700 underline"
            >
              {t(copied ? 'LoginScreen.copied' : 'LoginScreen.copyUrl')}
            </button>
          </div>
        )}

        {banned && (
          <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-3 text-sm font-bold text-rose-600">
            {t('LoginScreen.banned')}
          </div>
        )}

        <LoginButtons />

        {/* App Store 1.2:登入前看得到使用條款(零容忍)與隱私權政策 */}
        <p className="text-xs text-gray-400">
          <Trans
            i18nKey="LoginScreen.agreeTerms"
            components={{
              terms: <Link to="/terms" className="font-bold text-brand-pink underline" />,
              privacy: <Link to="/privacy" className="font-bold text-brand-pink underline" />,
            }}
          />
        </p>

        <p className="text-xs text-gray-300">{t('LoginScreen.privacyNote')}</p>
      </div>
    </div>
  )
}

// App 內建瀏覽器常擋 navigator.clipboard → 退回舊的 textarea + execCommand
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      ta.setSelectionRange(0, text.length)
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}
