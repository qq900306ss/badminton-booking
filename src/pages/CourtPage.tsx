import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useSessionView, useCourtActions, useSessionPlayers } from '../hooks/useSession'
import { CourtCard } from '../components/CourtCard'
import { FamilyBar } from '../components/FamilyBar'
import { CourtSkeleton } from '../components/Skeleton'
import { InstallButton } from '../components/InstallButton'
import { NotificationBell } from '../components/NotificationBell'
import { FairPlayInfo } from '../components/FairPlayInfo'
import { AnnouncementBanner } from '../components/AnnouncementBanner'
import { useToast } from '../components/Toast'
import { playChime, vibrate, notifyTurn, subscribePush } from '../lib/alert'
import { connectSessionWS } from '../lib/realtime'
import { pushNotif } from '../lib/notifications'
import { isPhotoUrl, DEFAULT_ORG_AVATAR } from '../lib/avatar'
import { sessionApi } from '../api/client'
import type { SessionPlayer } from '../api/client'
import { hydrateView } from '../lib/slimView'
import { isLoggedIn } from '../lib/playerAuth'
import { useBlocked, useMyAccountRef, useSessionOrgId, type BlockTarget } from '../hooks/useBlocks'
import { ModerationSheet } from '../components/ModerationSheet'
import { BlockedOrgNotice } from '../components/BlockedOrgNotice'

export function CourtPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const sid = sessionId ?? ''
  const nav = useNavigate()
  const { t } = useTranslation()

  // identity is bound to this session; bounce to entry if not joined yet
  const saved = localStorage.getItem(`badminton_${sid}`)
  const identity = saved ? (JSON.parse(saved) as { player_id: string; display_name: string }) : null
  const myPlayerId = identity?.player_id ?? null
  const myName = identity?.display_name ?? ''

  useEffect(() => {
    if (!identity) {
      nav(`/?s=${sid}`, { replace: true })
      return
    }
    // keep the global id in sync for the X-Player-ID request header
    localStorage.setItem('player_id', identity.player_id)
    localStorage.setItem('display_name', identity.display_name)
    // register for Web Push so 「輪到你了」reaches you even with the app closed
    subscribePush(
      () => sessionApi.vapidKey().then((r) => r.data.data.public_key),
      (sub) => sessionApi.pushSubscribe(sid, sub)
    )
  }, [sid]) // eslint-disable-line react-hooks/exhaustive-deps

  const [wsUp, setWsUp] = useState(false) // WS 活著 → 輪詢降頻成 60 秒對帳
  const { data: session, isLoading } = useSessionView(sessionId ?? '', wsUp)
  const { data: sessionPlayers, dataUpdatedAt: playersUpdatedAt } = useSessionPlayers(sid, true, wsUp)
  const { joinPlaying, joinQueue, leaveQueue, leavePlaying, voteEnd, addFamily, removeFamily } =
    useCourtActions(sessionId ?? '')

  const toast = useToast()
  const qc = useQueryClient()

  // 家人共用手機:這支手機可代操作「我」+ 自己帶的(已核准)家人。activePlayerId =
  // 目前正在幫誰操作;送 court action 時若不是本人就帶 as_player。
  const [activePlayerId, setActivePlayerId] = useState<string | null>(myPlayerId)
  const myFamily = (sessionPlayers ?? []).filter((p) => p.owner_id === myPlayerId)
  const actingId = activePlayerId ?? myPlayerId
  const asPlayerArg = actingId === myPlayerId ? undefined : actingId ?? undefined

  // ids this phone "owns" (me + my family members) — kept in a ref so the WS
  // callback (which doesn't re-subscribe on every players change) can tell when a
  // removed/renamed event is about someone I control, and toast accordingly.
  const myIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const s = new Set<string>()
    if (myPlayerId) s.add(myPlayerId)
    for (const p of sessionPlayers ?? []) if (p.owner_id === myPlayerId) s.add(p.player_id)
    myIdsRef.current = s
  }, [sessionPlayers, myPlayerId])
  // if the active family member was removed/rejected, fall back to myself.
  // depend on the actual data + current active id (no stale closure) so it
  // re-checks whenever the player list changes or the active identity switches.
  useEffect(() => {
    if (!activePlayerId || activePlayerId === myPlayerId) return
    const stillUsable = (sessionPlayers ?? []).some(
      (p) => p.player_id === activePlayerId && !p.pending
    )
    if (!stillUsable) setActivePlayerId(myPlayerId)
  }, [sessionPlayers, activePlayerId, myPlayerId])

  // 鎖屏/切走時 OS 凍結頁面,WS 被掐死、期間廣播全錯過 —— 回到前景那一刻
  // 立刻對帳,別等 60 秒輪詢(全域 refetchOnWindowFocus 是關的,這裡自己補)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && sid) {
        qc.invalidateQueries({ queryKey: ['session', sid] })
        qc.invalidateQueries({ queryKey: ['session-players', sid] })
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [sid, qc])

  // real-time: 伺服器直接把最新資料夾在 WS 訊息裡 → setQueryData 零重抓;
  // 沒帶 payload(舊格式/伺服器組失敗)才 fallback 成 invalidate→refetch。
  // lastApplied 擋亂序:只套用比上次新的訊息(伺服器帶 at 時間戳)。
  const lastApplied = useRef(0)
  const wasDown = useRef(false) // WS 斷過 → 重連成功那刻補一次對帳(斷線期間的廣播救不回來)
  useEffect(() => {
    if (!sid) return
    return connectSessionWS(
      sid,
      (m) => {
        if (m.t === 'changed') {
          if (m.view) {
            const at = m.at ?? Date.now()
            if (at >= lastApplied.current) {
              lastApplied.current = at
              if (m.players) qc.setQueryData(['session-players', sid], m.players)
              // v2 精簡快照:用名單把場上 / 排隊的人補完整;補不齊(名單還沒同步到新來的人)→ 重抓完整資料
              const players = m.players ?? qc.getQueryData<SessionPlayer[]>(['session-players', sid])
              const view = hydrateView(m.view, players)
              if (view) {
                qc.setQueryData(['session', sid], view)
              } else {
                qc.invalidateQueries({ queryKey: ['session', sid] })
                qc.invalidateQueries({ queryKey: ['session-players', sid] })
              }
            } else if (m.players) {
              // 晚到的舊推播帶著名單(改名 / 改程度…):比它新的球場推播可能已經用舊名單補過畫面,
              // 這則又因為比較舊被丟掉 → 名字會停在舊的。很少發生,直接重抓兩份對帳最穩
              qc.invalidateQueries({ queryKey: ['session', sid] })
              qc.invalidateQueries({ queryKey: ['session-players', sid] })
            }
          } else {
            const scope = m.scope ?? 'all'
            qc.invalidateQueries({ queryKey: ['session', sid] })
            if (scope !== 'court' && scope !== 'session') {
              qc.invalidateQueries({ queryKey: ['session-players', sid] })
            }
          }
        }
        // toast when the event is about me OR one of my family members
        if ((m.t === 'removed' || m.t === 'renamed') && myIdsRef.current.has(m.player)) {
          toast(m.msg, 'info')
          vibrate()
          pushNotif(sid, m.msg)
        }
      },
      (up) => {
        setWsUp(up)
        if (up && wasDown.current) {
          // 剛從斷線恢復:斷線期間的推播已經丟了,主動拉一次真相
          wasDown.current = false
          qc.invalidateQueries({ queryKey: ['session', sid] })
          qc.invalidateQueries({ queryKey: ['session-players', sid] })
        }
        if (!up) wasDown.current = true
      }
    )
  }, [sid, myPlayerId, qc, toast])

  // if the leader removed me from the session, boot me back to entry.
  // require 2 consecutive "absent" polls so DB eventual-consistency right after
  // joining doesn't falsely kick a fresh player.
  const absentCount = useRef(0)
  useEffect(() => {
    if (!sessionPlayers || !myPlayerId) return
    if (sessionPlayers.some((p) => p.player_id === myPlayerId)) {
      absentCount.current = 0
      return
    }
    absentCount.current += 1
    if (absentCount.current >= 2) {
      localStorage.removeItem(`badminton_${sid}`)
      toast(t('CourtPage.removedFromSession'), 'info')
      nav(`/?s=${sid}`, { replace: true })
    }
    // depend on playersUpdatedAt so this runs on EVERY poll (React Query reuses
    // the array reference when data is unchanged, which would otherwise skip it)
  }, [playersUpdatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // a player may only be in one court at a time — computed for the ACTING identity
  // (me, or the family member I'm currently controlling)
  const myCourt =
    session?.courts.find(
      (c) =>
        c.playing.some((p) => p.player_id === actingId) ||
        c.queue.some((p) => p.player_id === actingId)
    ) ?? null
  const myCourtId = myCourt?.court_id ?? null
  const myState: 'playing' | 'queued' | 'none' = !myCourt
    ? 'none'
    : myCourt.playing.some((p) => p.player_id === actingId)
      ? 'playing'
      : 'queued'

  // current name from live data (reflects a leader rename), fallback to stored
  const displayName =
    sessionPlayers?.find((p) => p.player_id === myPlayerId)?.display_name || myName

  // alert when promoted from queue → playing (輪到你了)
  const prevState = useRef<typeof myState | null>(null)
  useEffect(() => {
    if (prevState.current === 'queued' && myState === 'playing') {
      const where = myCourt?.name?.trim() ? myCourt.name : t('CourtPage.courtLabel', { num: myCourt?.court_num })
      toast(t('CourtPage.yourTurnToast'), 'success')
      playChime()
      vibrate()
      pushNotif(sid, t('CourtPage.yourTurnNotif', { where }))
      if (document.hidden) notifyTurn(t('CourtPage.comeBackToPlay', { where }))
    }
    prevState.current = myState
  }, [myState, myCourt, toast])

  // 檢舉 / 封鎖(App Store 1.2):點場上別人的頭像 → sheet;已封鎖的人遮掉名字頭像(人照樣在位置上)
  const { isPlayerBlocked, isOrgBlocked } = useBlocked()
  const myAccountRef = useMyAccountRef()
  const orgId = useSessionOrgId(sid, session)
  const [modTarget, setModTarget] = useState<BlockTarget | null>(null)
  const loggedIn = isLoggedIn()
  // 這支手機控制的人(我 + 我帶的家人)不給檢舉/封鎖;同帳號(account_ref 相同)也算自己
  const mineIds = new Set([myPlayerId, ...myFamily.map((p) => p.player_id)])
  const playerAction = (p: { player_id: string; display_name: string; avatar_url?: string; account_ref?: string }) => {
    if (!loggedIn || !p.player_id || mineIds.has(p.player_id)) return undefined
    if (myAccountRef && p.account_ref === myAccountRef) return undefined
    return () =>
      setModTarget({
        type: 'player',
        sessionId: sid,
        playerId: p.player_id,
        accountRef: p.account_ref,
        name: p.display_name,
        avatarUrl: p.avatar_url,
      })
  }
  const openOrgSheet = () =>
    setModTarget({
      type: 'org',
      sessionId: sid,
      orgId,
      name: session?.title || t('LobbyPage.defaultGroupName'),
      avatarUrl: session?.avatar_url,
    })

  // queue-open gate: before this time players can look but not join/queue
  const queueOpenAt = session?.queue_open_at ? new Date(session.queue_open_at) : null
  const locked = queueOpenAt ? new Date() < queueOpenAt : false
  const openTimeStr = queueOpenAt
    ? queueOpenAt.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
    : ''

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg p-4">
        <CourtSkeleton />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="card text-center">
          <p className="text-gray-500">{t('CourtPage.sessionNotFound')}</p>
        </div>
      </div>
    )
  }

  if (session.status === 'closed') {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="card text-center space-y-2">
          <div className="text-4xl">🎉</div>
          <p className="font-bold text-gray-700">{t('CourtPage.sessionEnded')}</p>
          <p className="text-gray-400 text-sm">{t('CourtPage.thanksSeeYou')}</p>
        </div>
      </div>
    )
  }

  // 已封鎖這個團主(用連結進來,或剛在場內封鎖):不顯示團名、公告與場地,只給解除封鎖 / 回大廳
  if (orgId && isOrgBlocked(orgId)) return <BlockedOrgNotice orgId={orgId} />

  return (
    <div className="min-h-screen bg-brand-bg">
      {modTarget && <ModerationSheet target={modTarget} onClose={() => setModTarget(null)} />}

      {/* header */}
      <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => nav('/')}
            className="text-gray-400 hover:text-brand-pink text-lg font-bold px-1"
            aria-label={t('CourtPage.backToLobby')}
          >
            ←
          </button>
          <span className="text-2xl">🏸</span>
          <span className="font-extrabold text-gray-800">{t('CourtPage.liveCourt')}</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell sessionId={sid} />
          <div className="w-8 h-8 rounded-full bg-brand-pink flex items-center justify-center
            text-white font-bold text-sm">
            {[...displayName][0]?.toUpperCase() ?? '?'}
          </div>
          <span className="text-sm font-semibold text-gray-600">{displayName}</span>
        </div>
      </div>

      {/* session title — 團主頭像 + 團名 */}
      {session.title && (
        <div className="flex items-center justify-center gap-2 pt-3">
          <div className="w-8 h-8 rounded-full bg-brand-pink/15 flex items-center justify-center shrink-0 overflow-hidden">
            {isPhotoUrl(session.avatar_url) ? (
              <img src={session.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg">{session.avatar_url || DEFAULT_ORG_AVATAR}</span>
            )}
          </div>
          <p className="font-extrabold text-gray-700">{session.title}</p>
          {/* ⋯ → 檢舉這個團 / 封鎖團主(沒公告的團也找得到入口) */}
          {loggedIn && (
            <button
              onClick={openOrgSheet}
              className="text-gray-400 hover:text-gray-600 font-extrabold px-1.5 leading-none"
              aria-label={t('CourtPage.reportOrBlockOrg')}
            >
              ⋯
            </button>
          )}
        </div>
      )}

      {/* 📢 場內公告(團主寫的,可收起;內容一改會自動重新展開)— 右側 ⋯ 可檢舉 / 封鎖 */}
      <AnnouncementBanner sessionId={sid} text={session.announcement} onMore={loggedIn ? openOrgSheet : undefined} />

      {/* 家人共用手機:身份切換 + 帶家人 */}
      <FamilyBar
        meId={myPlayerId}
        meName={displayName}
        family={myFamily}
        activeId={actingId}
        onSwitch={setActivePlayerId}
        onAdd={(name, level, avatar) => addFamily.mutate({ name, level, avatar })}
        onRemove={(playerId) => {
          if (playerId === activePlayerId) setActivePlayerId(myPlayerId) // don't keep acting as a removed member
          removeFamily.mutate(playerId)
        }}
        adding={addFamily.isPending}
      />

      {/* queue-open gate banner */}
      {locked && (
        <div className="mx-4 mt-3 bg-brand-yellow/60 rounded-2xl px-4 py-3 text-center">
          <p className="font-bold text-amber-700">⏰ {t('CourtPage.queueOpensAt', { time: openTimeStr })}</p>
          <p className="text-xs text-amber-600 mt-0.5">{t('CourtPage.queueLockedHint')}</p>
        </div>
      )}

      {/* 公平讓分 / 顯示場數 面板 */}
      <FairPlayInfo
        view={session}
        players={sessionPlayers ?? []}
        myIds={[myPlayerId, ...myFamily.map((p) => p.player_id)].filter((x): x is string => !!x)}
        isBlocked={isPlayerBlocked}
        playerAction={playerAction}
      />

      {/* courts grid */}
      <div className="p-4 grid gap-4 sm:grid-cols-2">
        {session.courts.map((court) => (
          <CourtCard
            key={court.court_id}
            court={court}
            myPlayerId={actingId}
            locked={locked}
            inAnotherCourt={myCourtId !== null && myCourtId !== court.court_id}
            onJoinPlaying={(position) => joinPlaying.mutate({ courtId: court.court_id, position, asPlayer: asPlayerArg })}
            onJoinQueue={() => joinQueue.mutate({ courtId: court.court_id, asPlayer: asPlayerArg })}
            onLeaveQueue={() => leaveQueue.mutate({ courtId: court.court_id, asPlayer: asPlayerArg })}
            onLeavePlaying={() => leavePlaying.mutate({ courtId: court.court_id, asPlayer: asPlayerArg })}
            onVoteEnd={() => voteEnd.mutate({ courtId: court.court_id, asPlayer: asPlayerArg })}
            votePending={voteEnd.isPending}
            isBlocked={isPlayerBlocked}
            playerAction={playerAction}
          />
        ))}
      </div>

      {/* refresh hint */}
      <div className="max-w-md mx-auto px-4 pb-2">
        <InstallButton label={t('CourtPage.installLabel')} />
      </div>
      <p className="text-center text-xs text-gray-300 pb-6">{t('CourtPage.liveUpdateFooter')}</p>
    </div>
  )
}
