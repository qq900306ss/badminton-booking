import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import i18n from '../i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { sessionApi, playerApi, type SessionSummary } from '../api/client'
import { getAccount, logout, updateAccount } from '../lib/playerAuth'
import { FeedbackButton } from '../components/FeedbackButton'
import { ChangelogButton } from '../components/ChangelogButton'
import { HelpButton } from '../components/HelpButton'
import { forceUpdate } from '../lib/appUpdate'
import { TW_CITIES } from '../lib/twCities'
import { InstallButton } from '../components/InstallButton'
import { LevelPicker } from '../components/LevelPicker'
import { ListSkeleton } from '../components/Skeleton'
import { isPhotoUrl, AVATAR_EMOJIS, DEFAULT_ORG_AVATAR } from '../lib/avatar'
import { OnboardingCards, ONBOARD_KEY } from '../components/OnboardingCards'
import { shareContent } from '../lib/share'

// 分享某一場給球友(揪人來打 = 最自然的推薦):原生分享面板,退回剪貼簿
async function shareSession(s: SessionSummary) {
  const when = fmtRange(s)
  const where = s.city ? `@${s.city}${s.district ? s.district : ''}` : ''
  const r = await shareContent({
    title: s.title || i18n.t('LobbyPage.defaultGroupName'),
    text: `🏸 ${s.title || i18n.t('LobbyPage.defaultGroupName')}${when ? ` ${when}` : ''}${where} — ${i18n.t('LobbyPage.shareSessionTail')}`,
    url: `${window.location.origin}/?s=${s.session_id}`,
  })
  if (r === 'copied') alert(i18n.t('LobbyPage.sessionLinkCopied'))
}

// 推薦整個 App(設定裡的「推薦給朋友」)
async function shareApp() {
  const r = await shareContent({
    title: i18n.t('LobbyPage.appName'),
    text: i18n.t('LobbyPage.shareAppText'),
    url: window.location.origin,
  })
  if (r === 'copied') alert(i18n.t('LobbyPage.appLinkCopied'))
}

function fmtRange(s: SessionSummary): string {
  if (!s.start_at) return ''
  const start = new Date(s.start_at)
  const hm = (d: Date) =>
    d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
  const day = `${start.getMonth() + 1}/${start.getDate()}`
  const tail = s.end_at ? `–${hm(new Date(s.end_at))}` : ''
  return `${day} ${hm(start)}${tail}`
}

function Intro({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  useEffect(() => {
    const timer = setTimeout(onDone, 2600)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center
        bg-gradient-to-br from-brand-pink via-brand-peach to-brand-yellow"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* floating sparkles */}
      {['✨', '🏸', '⭐️', '🎉'].map((e, i) => (
        <motion.span
          key={i}
          className="absolute text-3xl"
          style={{ left: `${15 + i * 22}%`, top: `${20 + (i % 2) * 50}%` }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: [0, 1, 0], y: [-10, -40] }}
          transition={{ duration: 2, delay: i * 0.25, repeat: Infinity }}
        >
          {e}
        </motion.span>
      ))}

      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        className="text-7xl mb-4 drop-shadow"
      >
        🏸
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-4xl font-extrabold text-white drop-shadow-md"
      >
        {t('LobbyPage.appName')}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-white/90 font-semibold mt-2"
      >
        {t('LobbyPage.tagline')}
      </motion.p>

      <button
        onClick={onDone}
        className="absolute bottom-10 bg-white/90 text-gray-700 font-bold
          px-6 py-2.5 rounded-2xl shadow-lg active:scale-95 transition-transform"
      >
        {t('LobbyPage.skip')}
      </button>
    </motion.div>
  )
}

export function LobbyPage() {
  const nav = useNavigate()
  const { t } = useTranslation()
  const [showIntro, setShowIntro] = useState(
    () => sessionStorage.getItem('intro_seen') !== '1'
  )

  function dismissIntro() {
    sessionStorage.setItem('intro_seen', '1')
    setShowIntro(false)
  }

  // 首次使用 → intro 動畫結束後接翻頁導覽;之後可從設定重看
  const [showOnboard, setShowOnboard] = useState(
    () => localStorage.getItem(ONBOARD_KEY) !== '1'
  )

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['open-sessions'],
    queryFn: () => sessionApi.listOpen().then((r) => r.data.data),
    refetchInterval: 30000, // discovery list — no live room, just a slow refresh
  })

  const list = (sessions ?? []).slice().sort((a, b) =>
    (a.start_at || a.opened_at).localeCompare(b.start_at || b.opened_at)
  )

  const [cityFilter, setCityFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')
  const [dayFilter, setDayFilter] = useState<number | null>(null) // Date.getDay() 0=日…6=六, null=全部
  const [showLoc, setShowLoc] = useState(false)
  // 區 options derived from the open sessions in the chosen city (no fixed list)
  const districtOpts = [
    ...new Set(
      list.filter((s) => !cityFilter || s.city === cityFilter).map((s) => s.district).filter(Boolean)
    ),
  ] as string[]
  const filtered = list.filter((s) => {
    if (cityFilter && s.city !== cityFilter) return false
    if (districtFilter && s.district !== districtFilter) return false
    if (dayFilter !== null) {
      if (!s.start_at) return false
      if (new Date(s.start_at).getDay() !== dayFilter) return false
    }
    return true
  })
  const locActive = !!(cityFilter || districtFilter)
  const locLabel = locActive
    ? `${cityFilter || t('LobbyPage.allCities')}${districtFilter ? ` · ${districtFilter}` : ''}`
    : t('LobbyPage.allAreas')

  const account = getAccount()
  const myName = account?.join_name || account?.display_name || ''
  const [editName, setEditName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [levelInput, setLevelInput] = useState(0)
  const [avatarInput, setAvatarInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [savingName, setSavingName] = useState(false)

  async function uploadPhoto(file: File) {
    if (file.size > 3 * 1024 * 1024) {
      alert(t('LobbyPage.photoTooLarge'))
      return
    }
    setUploading(true)
    try {
      const ct = file.type || 'image/jpeg'
      const r = await playerApi.avatarUploadUrl(ct)
      const { upload_url, public_url } = r.data.data
      const put = await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': ct } })
      if (!put.ok) throw new Error('upload failed')
      setAvatarInput(public_url)
    } catch {
      alert(t('LobbyPage.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  async function saveName() {
    const n = nameInput.trim()
    if (!n) return
    setSavingName(true)
    try {
      const r = await playerApi.updateProfile(n, levelInput, avatarInput)
      updateAccount(r.data.data)
      setEditName(false)
    } catch {
      /* keep dialog open on error */
    } finally {
      setSavingName(false)
    }
  }
  function doLogout() {
    logout()
    location.href = '/'
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* account bar — your identity has a home here */}
      <div className="bg-white shadow-sm px-4 py-2.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          {isPhotoUrl(account?.avatar_url) ? (
            <img src={account?.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-pink text-white flex items-center justify-center text-sm font-bold">
              {account?.avatar_url || [...myName][0]?.toUpperCase() || '?'}
            </div>
          )}
          <span className="font-semibold text-gray-700 text-sm truncate">{myName || t('LobbyPage.defaultPlayer')}</span>
        </div>
        <div className="flex items-center gap-3 text-sm shrink-0">
          <button
            onClick={() => {
              setNameInput(myName)
              setLevelInput(account?.default_level || 0)
              setAvatarInput(account?.avatar_url || '')
              setEditName(true)
            }}
            className="text-brand-pink font-semibold"
          >
            {t('LobbyPage.settings')}
          </button>
          <button onClick={doLogout} className="text-gray-400">{t('LobbyPage.logout')}</button>
        </div>
      </div>

      {editName && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
          onClick={() => setEditName(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-bold text-gray-700 text-center">{t('LobbyPage.yourProfile')}</p>
            <div>
              <span className="text-sm font-bold text-gray-600">{t('LobbyPage.joinName')}</span>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                autoFocus
                className="mt-1 w-full border-2 border-gray-200 rounded-2xl px-4 py-2.5 text-center font-bold
                  focus:outline-none focus:border-brand-pink"
              />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-600">{t('LobbyPage.defaultLevel')}</span>
              <LevelPicker value={levelInput} onChange={setLevelInput} />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-600">{t('LobbyPage.avatar')}</span>
              <div className="mt-1 flex items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-brand-pink flex items-center justify-center shrink-0 overflow-hidden">
                  {isPhotoUrl(avatarInput) ? (
                    <img src={avatarInput} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{avatarInput || '🏸'}</span>
                  )}
                </div>
                {account?.photo_url && (
                  <button
                    onClick={() => setAvatarInput(account.photo_url!)}
                    className="text-xs font-bold text-brand-pink border-2 border-brand-pink/40 rounded-full px-3 py-1.5"
                  >
                    {t('LobbyPage.useOAuthPhoto')}
                  </button>
                )}
                <label className="text-xs font-bold text-brand-pink border-2 border-brand-pink/40 rounded-full px-3 py-1.5 cursor-pointer">
                  {uploading ? t('LobbyPage.uploading') : t('LobbyPage.uploadPhoto')}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) uploadPhoto(f)
                    }}
                  />
                </label>
              </div>
              <div className="mt-2 grid grid-cols-8 gap-1.5">
                {AVATAR_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setAvatarInput(e)}
                    className={`text-xl rounded-lg py-1 ${avatarInput === e ? 'bg-brand-pink/20 ring-2 ring-brand-pink' : 'hover:bg-gray-100'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">{t('LobbyPage.profileHint')}</p>
            <div className="flex gap-2">
              <button onClick={() => setEditName(false)} className="btn-secondary flex-1">{t('LobbyPage.cancel')}</button>
              <button onClick={saveName} disabled={savingName} className="btn-primary flex-1">
                {savingName ? t('LobbyPage.saving') : t('LobbyPage.save')}
              </button>
            </div>
            {/* secondary actions tucked here so the top bar stays uncluttered */}
            <div className="border-t pt-3 grid grid-cols-2 gap-2">
              <HelpButton className="btn-secondary text-sm col-span-2" />
              <button
                onClick={() => { setEditName(false); setShowOnboard(true) }}
                className="btn-secondary text-sm col-span-2"
              >
                📖 {t('LobbyPage.tutorial')}
              </button>
              <button onClick={shareApp} className="btn-secondary text-sm col-span-2">
                📣 {t('LobbyPage.recommend')}
              </button>
              <ChangelogButton className="btn-secondary text-sm" />
              <FeedbackButton className="btn-secondary text-sm" />
              <button
                onClick={() => forceUpdate()}
                className="btn-secondary text-sm col-span-2"
                title={t('LobbyPage.updateTooltip')}
              >
                🔄 {t('LobbyPage.updateLatest')}
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>{showIntro && <Intro onDone={dismissIntro} />}</AnimatePresence>
      {!showIntro && showOnboard && <OnboardingCards onClose={() => setShowOnboard(false)} />}

      <header className="px-4 pt-8 pb-4 text-center">
        <div className="text-5xl mb-2">🏸</div>
        <h1 className="text-2xl font-extrabold text-gray-800">{t('LobbyPage.whichSession')}</h1>
        <p className="text-gray-400 text-sm mt-1">{t('LobbyPage.subtitle')}</p>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-3">
        <InstallButton />

        {/* 📋 我的場次:已加入 / 報名審核情況,一眼看到、一鍵回場 */}
        {list.some((s) => s.my_status) && (
          <div className="card space-y-2">
            <span className="font-bold text-gray-700">📋 {t('LobbyPage.mySessions')}</span>
            {list.filter((s) => s.my_status).map((s) => (
              <button
                key={s.session_id}
                onClick={() => nav(`/?s=${s.session_id}`)}
                className={`w-full text-left px-3 py-2.5 rounded-2xl flex items-center justify-between gap-2
                  active:scale-[0.98] transition-transform
                  ${s.my_status === 'member' ? 'bg-brand-mint/40' : 'bg-brand-yellow/40'}`}
              >
                <div className="min-w-0">
                  <p className="font-bold text-gray-700 truncate">{s.title || t('LobbyPage.defaultGroupName')}</p>
                  <p className="text-xs text-gray-500">{fmtRange(s)}</p>
                </div>
                {s.my_status === 'member' ? (
                  <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-white text-emerald-600">
                    ✅ {t('LobbyPage.memberBadge')} →
                  </span>
                ) : (
                  <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-white text-amber-600">
                    🙋 {t('LobbyPage.pendingBadge')}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* 星期篩選 — 球團多為每週固定,依場次日期的星期分流 */}
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 no-scrollbar">
          {[
            { l: t('LobbyPage.dayAll'), v: null as number | null },
            { l: t('LobbyPage.mon'), v: 1 }, { l: t('LobbyPage.tue'), v: 2 }, { l: t('LobbyPage.wed'), v: 3 },
            { l: t('LobbyPage.thu'), v: 4 }, { l: t('LobbyPage.fri'), v: 5 }, { l: t('LobbyPage.sat'), v: 6 }, { l: t('LobbyPage.sun'), v: 0 },
          ].map((d) => (
            <button
              key={d.l}
              onClick={() => setDayFilter(d.v)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors ${
                dayFilter === d.v
                  ? 'bg-brand-pink text-white shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {d.l}
            </button>
          ))}
        </div>

        {/* 地區篩選 — 收合,點開才出現縣市/區下拉 */}
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLoc((v) => !v)}
              className={`flex-1 flex items-center justify-between px-3.5 py-2 rounded-2xl text-sm font-semibold
                border-2 ${locActive ? 'border-brand-pink text-brand-pink bg-brand-pink/5' : 'border-gray-200 text-gray-500 bg-white'}`}
            >
              <span>📍 {locLabel}</span>
              <span className="text-xs">{showLoc ? '▲' : '▼'}</span>
            </button>
            {locActive && (
              <button
                onClick={() => { setCityFilter(''); setDistrictFilter('') }}
                className="shrink-0 px-3 py-2 rounded-2xl text-sm font-semibold text-gray-400 bg-white border-2 border-gray-200"
              >
                ✕ {t('LobbyPage.clear')}
              </button>
            )}
          </div>
          {showLoc && (
            <div className="flex gap-2 mt-2">
              <select
                value={cityFilter}
                onChange={(e) => { setCityFilter(e.target.value); setDistrictFilter('') }}
                className="flex-1 border-2 border-gray-200 rounded-2xl px-3 py-2 text-sm bg-white
                  focus:outline-none focus:border-brand-pink"
              >
                <option value="">{t('LobbyPage.allCities')}</option>
                {TW_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                disabled={districtOpts.length === 0}
                className="flex-1 border-2 border-gray-200 rounded-2xl px-3 py-2 text-sm bg-white
                  disabled:opacity-40 focus:outline-none focus:border-brand-pink"
              >
                <option value="">{t('LobbyPage.allDistricts')}</option>
                {districtOpts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
        </div>

        {isLoading && <ListSkeleton />}

        {!isLoading && filtered.length === 0 && (
          <div className="card text-center py-10 space-y-2">
            <div className="text-4xl">😴</div>
            <p className="font-bold text-gray-600">
              {dayFilter !== null || locActive ? t('LobbyPage.noMatch') : t('LobbyPage.noOpen')}
            </p>
            <p className="text-sm text-gray-400">{t('LobbyPage.emptyHint')}</p>
          </div>
        )}

        {filtered.map((s) => (
          <motion.div
            key={s.session_id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card w-full"
          >
            <button
              onClick={() => nav(`/?s=${s.session_id}`)}
              className="w-full text-left flex items-center gap-3
                active:scale-[0.98] transition-transform"
            >
              {/* 團主頭像:左側圓形,emoji 配淡底 / 照片裁圓,沒設定用預設 🐰 */}
              <div className="w-12 h-12 rounded-full bg-brand-pink/15 flex items-center justify-center shrink-0 overflow-hidden">
                {isPhotoUrl(s.avatar_url) ? (
                  <img src={s.avatar_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{s.avatar_url || DEFAULT_ORG_AVATAR}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-gray-800 text-lg break-words line-clamp-2" title={s.title}>{s.title || t('LobbyPage.defaultGroupName')}</p>
                {(s.city || s.district) && (
                  <p className="text-xs text-brand-pink font-semibold mt-0.5">
                    📍 {s.city}{s.district ? ` · ${s.district}` : ''}
                  </p>
                )}
                <p className="text-sm text-gray-400 mt-0.5">
                  {fmtRange(s) && <span>{fmtRange(s)} · </span>}
                  {t('LobbyPage.numCourts', { n: s.num_courts })}
                </p>
                {/* 開放報名的場次:已加入(/名額)· 報名中 */}
                {s.signup_open && s.joined_count !== undefined && (
                  <p className="text-xs font-semibold text-amber-600 mt-0.5">
                    🙋 {t('LobbyPage.joinedLabel')} {s.joined_count}{(s.signup_quota ?? 0) > 0 ? `/${s.signup_quota}` : ''} {t('LobbyPage.peopleUnit')}
                    {(s.pending_signups ?? 0) > 0 && <>{t('LobbyPage.pendingInline', { n: s.pending_signups })}</>}
                  </p>
                )}
                {/* 團簡介:卡片上最多兩行,點進去看全文 */}
                {s.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2 whitespace-pre-wrap">{s.description}</p>
                )}
              </div>
              <span
                className={`font-bold px-4 py-2 rounded-2xl text-sm shrink-0 ${
                  s.my_status === 'member'
                    ? 'bg-brand-mint text-emerald-700'
                    : s.my_status === 'pending'
                      ? 'bg-brand-yellow text-amber-700'
                      : 'bg-brand-pink text-white'
                }`}
              >
                {s.my_status === 'member' ? t('LobbyPage.enterBadge') : s.my_status === 'pending' ? t('LobbyPage.pendingBadgeShort') : s.signup_open ? t('LobbyPage.joinOrSignup') : t('LobbyPage.join')}
              </span>
            </button>
            {/* 卡片底部:聯繫團主(選填)+ 分享這場(揪人=推薦) */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex">
              {s.contact_url && (
                <a
                  href={s.contact_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  onClick={(e) => {
                    if (!confirm(t('LobbyPage.externalLinkConfirm'))) {
                      e.preventDefault()
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5
                    text-sm font-semibold text-brand-pink active:opacity-60"
                >
                  🔗 {t('LobbyPage.contactHost')}
                </a>
              )}
              <button
                onClick={() => shareSession(s)}
                className={`flex-1 flex items-center justify-center gap-1.5
                  text-sm font-semibold text-gray-400 active:opacity-60
                  ${s.contact_url ? 'border-l border-gray-100' : ''}`}
              >
                ↗ {t('LobbyPage.inviteBuddies')}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
