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
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold
                text-white bg-[#06C755] shadow active:scale-95 transition-transform"
            >
              <span className="text-lg">💬</span> 用 LINE 登入
            </a>
          )}
          {authProvidersConfigured.google && (
            <a
              href={googleLoginUrl()}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold
                bg-white border-2 border-gray-200 text-gray-700 shadow-sm active:scale-95 transition-transform"
            >
              <span className="text-lg">🔵</span> 使用 Google 登入
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
