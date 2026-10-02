import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { isInAppBrowser } from '../lib/inAppBrowser'
import { isIOSApp } from '../lib/native'
import { hasBannedNotice } from '../lib/playerAuth'
import { LoginButtons } from './LoginButtons'

// shown when a not-logged-in player tries to join. Browsing stays public;
// joining/playing requires an account (Google or LINE; Apple too inside the iOS app).
export function LoginScreen({ title }: { title?: string }) {
  const { t } = useTranslation()
  const inApp = isInAppBrowser()
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
            <p className="text-sm font-bold text-amber-700">{t('LoginScreen.inAppTitle')}</p>
            <p className="text-xs text-amber-600">
              {t('LoginScreen.inAppBody')}
            </p>
            <button
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              className="text-xs font-bold text-amber-700 underline"
            >
              {t('LoginScreen.copyUrl')}
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
