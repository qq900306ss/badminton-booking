import { googleLoginUrl, lineLoginUrl, authProvidersConfigured } from '../lib/playerAuth'

// shown when a not-logged-in player tries to join. Browsing stays public;
// joining/playing requires an account (Google or LINE).
export function LoginScreen({ title = '登入後加入球場' }: { title?: string }) {
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-7">
        <div>
          <div className="text-5xl mb-2">🏸</div>
          <h1 className="text-2xl font-extrabold text-gray-800">{title}</h1>
          <p className="text-gray-400 text-sm mt-1">用 LINE 或 Google 快速登入,記住你的身份、程度與場次</p>
        </div>

        <div className="space-y-3">
          {authProvidersConfigured.line && (
            <a
              href={lineLoginUrl()}
              className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl font-bold
                text-white bg-[#06C755] shadow active:scale-95 transition-transform"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.48 2 2 5.7 2 10.26c0 4.08 3.55 7.5 8.35 8.15.32.07.77.21.88.49.1.25.06.64.03.89l-.14.85c-.04.25-.2.98.86.53 1.06-.45 5.7-3.36 7.78-5.75C21.4 13.79 22 12.1 22 10.26 22 5.7 17.52 2 12 2zM8.2 12.6H6.6c-.23 0-.42-.19-.42-.42V9.02c0-.23.19-.42.42-.42.24 0 .43.19.43.42v2.74h1.17c.24 0 .43.18.43.41 0 .24-.19.43-.43.43zm1.67-.42c0 .23-.19.42-.43.42a.42.42 0 0 1-.42-.42V9.02c0-.23.19-.42.42-.42.24 0 .43.19.43.42v3.16zm3.8 0c0 .18-.12.34-.29.4a.5.5 0 0 1-.14.02.42.42 0 0 1-.34-.17l-1.62-2.2v1.95c0 .23-.19.42-.43.42a.42.42 0 0 1-.42-.42V9.02c0-.18.11-.34.29-.4a.43.43 0 0 1 .48.15l1.63 2.2V9.02c0-.23.19-.42.42-.42.24 0 .43.19.43.42v3.16zm2.55-2c.24 0 .43.19.43.42 0 .24-.19.43-.43.43h-1.17v.73h1.17c.24 0 .43.19.43.42 0 .24-.19.43-.43.43h-1.6a.42.42 0 0 1-.42-.43V9.02c0-.23.19-.42.42-.42h1.6c.24 0 .43.19.43.42 0 .24-.19.43-.43.43h-1.17v.73h1.17z" />
              </svg>
              用 LINE 登入
            </a>
          )}
          {authProvidersConfigured.google && (
            <a
              href={googleLoginUrl()}
              className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl font-bold
                bg-white border-2 border-gray-200 text-gray-700 shadow-sm active:scale-95 transition-transform"
            >
              <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              使用 Google 登入
            </a>
          )}
          {!authProvidersConfigured.line && !authProvidersConfigured.google && (
            <p className="text-sm text-red-400">登入尚未設定,請聯絡管理員</p>
          )}
        </div>

        <p className="text-xs text-gray-300">登入只用來辨識你的身份,你的 email 不會公開給團主</p>
      </div>
    </div>
  )
}
