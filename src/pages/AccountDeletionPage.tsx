import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { playerApi } from '../api/client'
import {
  isLoggedIn,
  getAccount,
  getToken,
  logout,
  clearAccountData,
  googleLoginUrl,
  lineLoginUrl,
  authProvidersConfigured,
} from '../lib/playerAuth'
import { DeletionScope } from '../components/DeletionScope'
import { useToast, errMsg } from '../components/Toast'

// 公開的刪除帳號頁(/account-deletion):Google Play 要求「App 內」跟「公開網址」都能刪帳號,
// 所以這頁不走登入閘 —— 沒登入也看得到會刪什麼、留什麼,再引導先登入。
// 登入後才顯示刪除鈕;確認走「第二顆明確按鈕」(App 裡 window.confirm 不可靠,TWA/內建瀏覽器常直接吞掉)。
// 登入流程沿用 googleLoginUrl / lineLoginUrl:OAuth state 會記住目前路徑,登入完回到這頁。
export function AccountDeletionPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn())
  // 開啟確認時記下當下的 token:確認綁定這個帳號,期間換了帳號就作廢
  const [confirmToken, setConfirmToken] = useState<string | null>(null)
  const confirming = confirmToken !== null
  const setConfirming = (on: boolean) => setConfirmToken(on ? getToken() : null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const account = loggedIn ? getAccount() : null
  const name = account?.join_name || account?.display_name || ''

  async function doDelete() {
    setDeleting(true)
    setError('')
    try {
      if (!confirmToken || getToken() !== confirmToken) {
        // 確認之後帳號變了(別的分頁登出/換帳號)→ 不刪,重新整理顯示目前帳號
        setConfirming(false)
        setLoggedIn(isLoggedIn())
        setError(t('AccountDeletionPage.accountChanged'))
        return
      }
      await playerApi.deleteMe(confirmToken)
      // 跟登出同一套清法,再多清掉綁這個人的裝置資料;react-query 快取也丟掉免得殘留舊畫面
      clearAccountData()
      qc.clear()
      nav('/', { replace: true })
      toast(t('AccountDeletionPage.deleted'), 'success')
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        // token 過期/失效:清掉登入態,畫面切回「請先登入」
        logout()
        setLoggedIn(false)
        setConfirming(false)
        setError(t('AccountDeletionPage.sessionExpired'))
      } else {
        setError(errMsg(e, t('AccountDeletionPage.failed')))
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg px-4 pt-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link to="/" className="text-sm font-bold text-brand-pink">
          ← {t('AccountDeletionPage.backHome')}
        </Link>
        <header className="text-center space-y-1">
          <div className="text-4xl">🗑️</div>
          <h1 className="text-2xl font-extrabold text-gray-800">{t('AccountDeletionPage.title')}</h1>
          <p className="text-sm text-gray-500">{t('AccountDeletionPage.intro')}</p>
        </header>

        <section className="card space-y-3">
          <DeletionScope />
          <Link to="/privacy" className="block text-xs font-bold text-brand-pink">
            🔒 {t('AccountDeletionPage.privacyLink')}
          </Link>
        </section>

        {error && <p className="text-sm font-bold text-red-400 text-center">{error}</p>}

        {loggedIn ? (
          <section className="card space-y-3">
            <p className="text-sm text-gray-600">
              {t('AccountDeletionPage.loggedInAs', { name: name || t('AccountDeletionPage.thisAccount') })}
            </p>
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                className="w-full py-3 rounded-2xl font-bold text-white bg-red-500 shadow active:scale-95 transition-transform"
              >
                {t('AccountDeletionPage.deleteButton')}
              </button>
            ) : (
              <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-3 space-y-3">
                <p className="text-sm font-bold text-red-600">⚠️ {t('AccountDeletionPage.confirmTitle')}</p>
                <p className="text-xs text-red-500">{t('AccountDeletionPage.confirmBody')}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={deleting}
                    className="btn-secondary flex-1 text-sm disabled:opacity-40"
                  >
                    {t('AccountDeletionPage.cancel')}
                  </button>
                  <button
                    onClick={doDelete}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm text-white bg-red-600 shadow
                      active:scale-95 transition-transform disabled:opacity-40"
                  >
                    {deleting ? t('AccountDeletionPage.deleting') : t('AccountDeletionPage.confirmButton')}
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="card space-y-3 text-center">
            <p className="text-sm font-bold text-gray-700">{t('AccountDeletionPage.loginFirst')}</p>
            <p className="text-xs text-gray-500">{t('AccountDeletionPage.loginHint')}</p>
            {authProvidersConfigured.line && (
              <button
                onClick={() => {
                  window.location.href = lineLoginUrl()
                }}
                className="w-full py-3 rounded-2xl font-bold text-white bg-[#06C755] shadow active:scale-95 transition-transform"
              >
                {t('LoginScreen.lineLogin')}
              </button>
            )}
            {authProvidersConfigured.google && (
              <button
                onClick={() => {
                  window.location.href = googleLoginUrl()
                }}
                className="w-full py-3 rounded-2xl font-bold bg-white border-2 border-gray-200 text-gray-700
                  shadow-sm active:scale-95 transition-transform"
              >
                {t('LoginScreen.googleLogin')}
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
