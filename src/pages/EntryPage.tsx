import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sessionApi } from '../api/client'
import { LevelPicker } from '../components/LevelPicker'
import { requestNotify } from '../lib/alert'
import { isLoggedIn, getAccount } from '../lib/playerAuth'
import { LoginScreen } from '../components/LoginScreen'

// per-session identity, so back-button can't re-pick / orphan a claimed name
const idKey = (sid: string) => `badminton_${sid}`

export function EntryPage() {
  const [params] = useSearchParams()
  const sessionId = params.get('s') ?? ''
  const nav = useNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation()

  const [step, setStep] = useState<'password' | 'pick'>('password')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(
    () => getAccount()?.join_name || getAccount()?.display_name || ''
  )
  const [level, setLevel] = useState(() => getAccount()?.default_level || 0)

  // 報名(前台報名開啟的場次)
  const [signupMsg, setSignupMsg] = useState('')
  const [editingMsg, setEditingMsg] = useState(false)
  const [signupBusy, setSignupBusy] = useState(false)
  const [familyNames, setFamilyNames] = useState<string[]>([]) // 一起報名的家人(≤5)

  const loggedIn = isLoggedIn()

  // 場次公開資訊:簡介、報名開關、已加入/報名中人數
  const { data: view } = useQuery({
    queryKey: ['entry-session', sessionId],
    queryFn: () => sessionApi.getView(sessionId).then((r) => r.data.data),
    enabled: !!sessionId,
    refetchInterval: 15000, // 報名人數會變,慢速刷新就好
  })

  // 我對這場的報名狀態(none / pending / member)
  const { data: mySignup } = useQuery({
    queryKey: ['my-signup', sessionId],
    queryFn: () => sessionApi.mySignup(sessionId).then((r) => r.data.data),
    enabled: !!sessionId && loggedIn,
    refetchInterval: 10000, // 等核准中 → 核准瞬間自動進場
  })

  // already joined this session? verify the identity still exists, THEN go to the
  // court. if the leader removed it, clear it and let them re-pick.
  // 也涵蓋「報名被核准」:roster 裡有我的帳號 id 就直接採用進場。
  useEffect(() => {
    if (!sessionId) return
    const saved = localStorage.getItem(idKey(sessionId))
    const accountID = getAccount()?.player_id
    const adopt = (player_id: string, display_name: string) => {
      localStorage.setItem(idKey(sessionId), JSON.stringify({ player_id, display_name }))
      localStorage.setItem('player_id', player_id)
      localStorage.setItem('display_name', display_name)
      nav(`/court/${sessionId}`, { replace: true })
    }
    sessionApi
      .getPlayers(sessionId)
      .then((r) => {
        if (saved) {
          const { player_id, display_name } = JSON.parse(saved)
          if (r.data.data.some((p) => p.player_id === player_id)) {
            adopt(player_id, display_name)
            return
          }
          localStorage.removeItem(idKey(sessionId)) // 被移出 → 清掉,重新選
        }
        // 報名核准後(或在別台裝置加入過):成員裡有我的帳號 → 直接進場
        const mine = accountID
          ? r.data.data.find((p) => p.player_id === accountID && !p.pending)
          : undefined
        if (mine) adopt(mine.player_id, mine.display_name)
      })
      .catch(() => {
        if (!saved) return
        // network hiccup — fall back to going in with the stored identity
        const { player_id, display_name } = JSON.parse(saved)
        localStorage.setItem('player_id', player_id)
        localStorage.setItem('display_name', display_name)
        nav(`/court/${sessionId}`, { replace: true })
      })
  }, [sessionId, nav, mySignup?.status])

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim() || !sessionId) return
    setLoading(true)
    setError('')
    try {
      await sessionApi.verifyPassword(sessionId, password)
      setStep('pick')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setError(status === 401 ? t('EntryPage.wrongPasswordRetry') : status === 410 ? t('EntryPage.sessionEnded') : t('EntryPage.verifyFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function confirmJoin() {
    const n = name.trim()
    if (!n) {
      setError(t('EntryPage.enterNamePrompt'))
      return
    }
    requestNotify() // 趁這個使用者點擊,順便要通知權限(輪到你了會用到)
    setLoading(true)
    setError('')
    try {
      const res = await sessionApi.join(sessionId, password, n, level)
      const { player_id, display_name } = res.data.data
      localStorage.setItem(idKey(sessionId), JSON.stringify({ player_id, display_name }))
      localStorage.setItem('player_id', player_id)
      localStorage.setItem('display_name', display_name)
      nav(`/court/${sessionId}`, { replace: true })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(status === 401 ? t('EntryPage.wrongPassword') : msg ?? t('EntryPage.joinFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function submitSignup() {
    setSignupBusy(true)
    setError('')
    try {
      await sessionApi.signup(sessionId, signupMsg.trim(),
        familyNames.map((n) => n.trim()).filter(Boolean))
      requestNotify() // 核准通知會用到
      setEditingMsg(false)
      qc.invalidateQueries({ queryKey: ['my-signup', sessionId] })
      qc.invalidateQueries({ queryKey: ['entry-session', sessionId] })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? t('EntryPage.signupFailed'))
    } finally {
      setSignupBusy(false)
    }
  }

  async function withdrawSignup() {
    const withFamily = (mySignup?.family_names?.length ?? 0) > 0
    if (!window.confirm(withFamily ? t('EntryPage.cancelSignupConfirmFamily') : t('EntryPage.cancelSignupConfirm'))) return
    setSignupBusy(true)
    try {
      await sessionApi.cancelSignup(sessionId)
      setSignupMsg('')
      qc.invalidateQueries({ queryKey: ['my-signup', sessionId] })
      qc.invalidateQueries({ queryKey: ['entry-session', sessionId] })
    } finally {
      setSignupBusy(false)
    }
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg p-6">
        <div className="card text-center">
          <div className="text-4xl mb-3">🏸</div>
          <p className="text-gray-500">{t('EntryPage.scanQrPrompt')}</p>
        </div>
      </div>
    )
  }

  // mandatory login: must have an account before joining a session
  if (!loggedIn) {
    return <LoginScreen title={t('EntryPage.loginToJoin')} />
  }

  const quota = view?.signup_quota ?? 0
  const joined = view?.joined_count
  const pendingCount = view?.pending_signups ?? 0
  const quotaFull = quota > 0 && (joined ?? 0) >= quota
  const isPending = mySignup?.status === 'pending'

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🏸</div>
          <h1 className="text-2xl font-extrabold text-gray-800">{view?.title || t('EntryPage.defaultTitle')}</h1>
          {/* 已加入 X(/名額)· 報名中 N — 開放報名的場次才顯示 */}
          {view?.signup_open && joined !== undefined && (
            <p className="text-sm font-semibold text-gray-500 mt-1.5">
              {t('EntryPage.joinedPrefix')} <span className="text-brand-pink font-bold">{joined}{quota > 0 ? `/${quota}` : ''}</span> {t('EntryPage.peopleUnit')}
              {pendingCount > 0 && <>{t('EntryPage.pendingInline', { n: pendingCount })}</>}
            </p>
          )}
        </div>

        {/* 團簡介 + 聯繫團主(團主選填;人家簡介常寫「先聯繫團長」,按鈕就要在旁邊) */}
        {(view?.description || view?.contact_url) && (
          <div className="card mb-4">
            {view.description && (
              <>
                <p className="text-xs font-bold text-gray-400 mb-1">📣 {t('EntryPage.hostMessage')}</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{view.description}</p>
              </>
            )}
            {view.contact_url && (
              <a
                href={view.contact_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                onClick={(e) => {
                  if (!window.confirm(t('EntryPage.externalLinkConfirm'))) {
                    e.preventDefault()
                  }
                }}
                className={`flex items-center justify-center gap-1.5 text-sm font-semibold
                  text-brand-pink active:opacity-60 ${view.description ? 'mt-3 pt-3 border-t border-gray-100' : ''}`}
              >
                🔗 {t('EntryPage.contactHost')}
              </a>
            )}
          </div>
        )}

        {/* 報名中 → 狀態橫幅(可改留言 / 取消),密碼表單照常提供 */}
        {isPending && (
          <div className="card mb-4 border-2 border-amber-300 bg-amber-50 space-y-2">
            <p className="font-bold text-amber-700">🙋 {t('EntryPage.pendingBanner')}</p>
            <p className="text-xs text-amber-600">{t('EntryPage.pendingHint')}</p>
            {(mySignup?.family_names?.length ?? 0) > 0 && (
              <p className="text-sm text-gray-600">
                👨‍👩‍👧 {t('EntryPage.signupTogether')}{mySignup?.family_names?.join('、')}
                <span className="text-xs text-gray-400">{t('EntryPage.changeNote')}</span>
              </p>
            )}
            {!editingMsg ? (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-sm text-gray-600 whitespace-pre-wrap">
                  {mySignup?.message ? `💬 ${mySignup.message}` : t('EntryPage.noMessage')}
                </p>
                <button
                  onClick={() => { setSignupMsg(mySignup?.message ?? ''); setEditingMsg(true) }}
                  className="text-xs font-bold text-brand-pink shrink-0"
                >
                  {t('EntryPage.editMessage')}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={signupMsg}
                  onChange={(e) => setSignupMsg(e.target.value)}
                  maxLength={100}
                  rows={2}
                  autoFocus
                  className="w-full border-2 border-amber-200 rounded-2xl px-3 py-2 text-sm resize-none
                    focus:outline-none focus:border-brand-pink bg-white"
                />
                <div className="flex gap-2">
                  <button onClick={submitSignup} disabled={signupBusy} className="btn-primary flex-1 py-2 text-sm disabled:opacity-40">
                    {signupBusy ? t('EntryPage.savingMessage') : t('EntryPage.saveMessage')}
                  </button>
                  <button onClick={() => setEditingMsg(false)} className="btn-secondary px-4 text-sm">{t('EntryPage.cancel')}</button>
                </div>
              </div>
            )}
            <button
              onClick={withdrawSignup}
              disabled={signupBusy}
              className="w-full text-xs text-gray-400 underline disabled:opacity-40"
            >
              {t('EntryPage.cancelSignup')}
            </button>
          </div>
        )}

        {/* step 1: password */}
        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="card space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-gray-600">{t('EntryPage.courtPassword')}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('EntryPage.enterPassword')}
                className="mt-1 w-full border-2 border-gray-200 rounded-2xl px-4 py-3
                  focus:outline-none focus:border-brand-pink text-center text-lg font-bold"
                autoFocus
              />
            </label>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button type="submit" disabled={!password.trim() || loading} className="btn-primary w-full">
              {loading ? t('EntryPage.verifying') : t('EntryPage.enter')}
            </button>
          </form>
        )}

        {/* 沒密碼?開放報名的場次可以直接報名給團主審 */}
        {step === 'password' && view?.signup_open && !isPending && (
          <div className="card mt-4 space-y-3">
            <div>
              <span className="font-bold text-gray-700">🙋 {t('EntryPage.noPasswordTitle')}</span>
              <p className="text-xs text-gray-400 mt-1">
                {t('EntryPage.signupDesc')}
                {quotaFull && t('EntryPage.quotaFullNote')}
              </p>
            </div>
            <textarea
              value={signupMsg}
              onChange={(e) => setSignupMsg(e.target.value)}
              placeholder={t('EntryPage.signupMsgPlaceholder')}
              maxLength={100}
              rows={2}
              className="w-full border-2 border-gray-200 rounded-2xl px-3 py-2 text-sm resize-none
                focus:outline-none focus:border-brand-pink"
            />
            {/* 帶家人一起報名(同一支手機的同行者,核准後由你代操作) */}
            {familyNames.map((n, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={n}
                  onChange={(e) =>
                    setFamilyNames(familyNames.map((x, j) => (j === i ? e.target.value : x)))
                  }
                  placeholder={t('EntryPage.familyNamePlaceholder', { n: i + 1 })}
                  maxLength={40}
                  autoFocus={n === ''}
                  className="flex-1 border-2 border-gray-200 rounded-2xl px-3 py-2 text-sm
                    focus:outline-none focus:border-brand-pink"
                />
                <button
                  onClick={() => setFamilyNames(familyNames.filter((_, j) => j !== i))}
                  className="text-gray-300 hover:text-red-400 font-bold px-1"
                >
                  ×
                </button>
              </div>
            ))}
            {familyNames.length < 5 && (
              <button
                onClick={() => setFamilyNames([...familyNames, ''])}
                className="w-full text-xs font-semibold text-brand-pink py-1"
              >
                ＋ {t('EntryPage.addFamily')}
              </button>
            )}
            <button
              onClick={submitSignup}
              disabled={signupBusy}
              className="w-full text-sm font-bold py-2.5 rounded-2xl bg-brand-yellow text-amber-700
                active:scale-95 transition-transform disabled:opacity-40"
            >
              {signupBusy
                ? t('EntryPage.submitting')
                : familyNames.filter((n) => n.trim()).length > 0
                  ? t('EntryPage.submitSignupCount', { count: 1 + familyNames.filter((n) => n.trim()).length })
                  : t('EntryPage.submitSignup')}
            </button>
          </div>
        )}

        {/* step 2: confirm name + level (pre-filled from your account) */}
        {step === 'pick' && (
          <div className="card space-y-4">
            <div>
              <span className="text-sm font-bold text-gray-600">{t('EntryPage.yourName')}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('EntryPage.yourNamePlaceholder')}
                autoFocus
                className="mt-1 w-full border-2 border-gray-200 rounded-2xl px-4 py-3
                  focus:outline-none focus:border-brand-pink text-center text-lg font-bold"
              />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-600">{t('EntryPage.level')}</span>
              <LevelPicker value={level} onChange={setLevel} />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button onClick={confirmJoin} disabled={loading || !name.trim()} className="btn-primary w-full">
              {loading ? t('EntryPage.joining') : t('EntryPage.enterCourt')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
