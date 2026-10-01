import { useTranslation } from 'react-i18next'
import { isInAppBrowser } from '../lib/inAppBrowser'
import { isIOSApp } from '../lib/native'
import { LoginButtons } from './LoginButtons'

// shown when a not-logged-in player tries to join. Browsing stays public;
// joining/playing requires an account (Google or LINE; Apple too inside the iOS app).
export function LoginScreen({ title }: { title?: string }) {
  const { t } = useTranslation()
  const inApp = isInAppBrowser()
  const resolvedTitle = title ?? t('LoginScreen.defaultTitle')
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

        <LoginButtons />

        <p className="text-xs text-gray-300">{t('LoginScreen.privacyNote')}</p>
      </div>
    </div>
  )
}
