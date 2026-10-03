import axios from 'axios'
import { CLIENT_SOURCE } from '../lib/clientSource'
import { logout, clearAccountData, markBannedNotice } from '../lib/playerAuth'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export const api = axios.create({ baseURL: BASE })

// attach the player JWT on every request (X-Player-ID is gone — pure JWT now)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('player_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  // 來源平台(iOS app / Android app / PWA / 網頁),後端記在帳號、回饋與檢舉上。
  // 只加在打自家 API 的這個 axios 實例:頭像直傳 S3 用的是 fetch,不能帶(S3 的 CORS 不認這個標頭)
  config.headers['X-Client'] = CLIENT_SOURCE
  return config
})

// 帶著 player token 卻被擋 401 = token 失效(過期、帳號已在別台裝置刪除,或被停權)→ 清掉登入態、回首頁重新登入。
// 只認「請先登入 / 帳號已刪除 / 帳號已停權」這幾種訊息:join / verify-password 打錯密碼也回 401("wrong password"),那不能登出。
// 公開頁(隱私權、使用條款、刪帳號、安裝頁)與 OAuth callback 不強制跳轉,讓它們自己處理。
const BANNED_ERROR = '帳號已停權'
const DEAD_TOKEN_ERRORS = ['請先登入', '帳號已刪除,請重新登入', BANNED_ERROR]
const NO_REDIRECT_PATHS = ['/privacy', '/terms', '/account-deletion', '/install', '/auth/']
api.interceptors.response.use(undefined, (err) => {
  const status = err?.response?.status
  const msg = err?.response?.data?.error
  const sentAuth: string | undefined = err?.config?.headers?.['Authorization']
  // 只在「失敗的就是目前這顆 token」時才清:別的分頁可能已換成新登入,舊請求晚回來不能把它登出
  const current = localStorage.getItem('player_token')
  const isCurrentToken = !!sentAuth && !!current && sentAuth === `Bearer ${current}`
  if (status === 401 && isCurrentToken && DEAD_TOKEN_ERRORS.includes(msg)) {
    // 帳號被刪 → 連裝置上綁這個人的資料一起清;單純過期 → 跟登出一樣就好(重登同帳號還接得上)
    if (msg === '帳號已刪除,請重新登入') clearAccountData()
    else logout()
    // 停權:回到登入畫面時要說清楚為什麼被登出(LoginScreen 讀這個旗標顯示一次)
    if (msg === BANNED_ERROR) markBannedNotice()
    const path = window.location.pathname
    if (!NO_REDIRECT_PATHS.some((p) => path.startsWith(p))) window.location.href = '/'
  }
  return Promise.reject(err)
})

export interface Player {
  player_id: string
  provider: string
  display_name: string
  join_name?: string
  default_level?: number
  avatar_url?: string
  photo_url?: string
  email?: string
  account_ref?: string // 自己的匿名識別碼(跟場上 slot 的 account_ref 同一套;登入回應與 /players/me 都帶),用來不對自己顯示檢舉/封鎖
  created_at: string
}

export const playerApi = {
  google: (code: string) =>
    api.post<{ data: { token: string; player: Player } }>('/api/auth/player/google', { code }),
  line: (code: string) =>
    api.post<{ data: { token: string; player: Player } }>('/api/auth/player/line', { code }),
  // iOS App 的「使用 Apple 登入」:name 只有第一次授權才有,後端只在建新帳號時用
  apple: (idToken: string, code: string, name: string) =>
    api.post<{ data: { token: string; player: Player } }>('/api/auth/player/apple', {
      id_token: idToken,
      code,
      name,
    }),
  // iOS App 的 APNs device token(跟 Web Push 訂閱並存,後端兩邊都推)
  registerApns: (token: string, sandbox: boolean) => api.post('/api/push/apns', { token, sandbox }),
  me: () => api.get<{ data: Player }>('/api/players/me'),
  updateProfile: (joinName: string, defaultLevel: number, avatarUrl: string) =>
    api.put<{ data: Player }>('/api/players/me', {
      join_name: joinName,
      default_level: defaultLevel,
      avatar_url: avatarUrl,
    }),
  avatarUploadUrl: (contentType: string) =>
    api.post<{ data: { upload_url: string; public_url: string } }>(
      '/api/players/me/avatar-upload-url',
      { content_type: contentType }
    ),
  sendFeedback: (message: string) => api.post('/api/feedback', { message }),
  // 刪除自己的帳號(Google Play 要求 App 內可刪帳號);成功回 204
  // 明確帶「按下確認時」的 token,不吃 request interceptor 讀到的最新 token:
  // 確認後別的分頁換了帳號,也不會誤刪到另一個人
  deleteMe: (token: string) => api.delete('/api/players/me', { headers: { Authorization: `Bearer ${token}` } }),
}

export interface PlayerSlot {
  player_id: string
  display_name: string
  level: number
  games: number
  avatar_url?: string
  account_ref?: string // 帳號的匿名識別碼(跨場次封鎖用);團主手動加的名字/臨時加的人沒有
}

export interface CourtView {
  court_id: string
  court_num: number
  name?: string
  locked?: boolean // 團主鎖定中:不能自助上場/排隊
  status: 'empty' | 'playing'
  playing: PlayerSlot[]
  queue: PlayerSlot[]
  started_at?: string
  can_undo?: boolean
  end_votes?: string[] // player_ids who voted to end (only those still playing)
  end_votes_needed?: number
}

export interface SessionView {
  session_id: string
  org_id?: string // 開這場的團主(REST 與 WS 的 view 都帶),判斷「已封鎖這個團主」用
  title: string
  num_courts: number
  status: string
  start_at?: string
  end_at?: string
  queue_open_at?: string
  contact_url?: string
  avatar_url?: string // 團主頭像(emoji 或照片網址),空=預設 🐰
  announcement?: string // 場內公告(團主寫給場內成員,選填)
  // 前台報名
  description?: string // 團簡介(選填)
  signup_open?: boolean // 這場開放前台報名
  signup_quota?: number // 收人名額(0=不限,軟上限)
  joined_count?: number // 已加入人數
  pending_signups?: number // 報名中(等核准)人數
  // 進階:公平讓分
  show_games?: boolean
  fair_play?: boolean
  fair_grace_games?: number
  fair_threshold?: number
  fair_avg?: number
  fair_limit?: number
  fair_active?: number
  fair_enforced?: boolean
  courts: CourtView[]
}

export interface SessionSummary {
  session_id: string
  org_id?: string // 開這場的團主,大廳用來濾掉已封鎖的團主
  title: string
  city?: string
  district?: string
  num_courts: number
  status: string
  start_at?: string
  end_at?: string
  queue_open_at?: string
  contact_url?: string // 團主提供的外部聯繫連結(選填)
  avatar_url?: string // 團主頭像(emoji 或照片網址),空=預設 🐰
  opened_at: string
  // 前台報名(進行中場次會帶 counts)
  description?: string
  signup_open?: boolean
  signup_quota?: number
  joined_count?: number
  played_count?: number // 實際上場打過至少一場的人數
  pending_signups?: number
  my_status?: 'member' | 'pending' // 已加入 / 報名中(帶登入態打大廳才有)
}

export interface SessionPlayer {
  player_id: string
  display_name: string
  level: number
  claimed: boolean
  is_temp: boolean
  games?: number // 打過幾場(公平讓分 / 顯示場數用)
  avatar_url?: string
  owner_id?: string // 家人子身份:帶它來的手機帳號
  pending?: boolean // 家人待團主核准
  account_ref?: string // 同 PlayerSlot.account_ref
}

export const sessionApi = {
  listOpen: () => api.get<{ data: SessionSummary[] }>('/api/sessions/open'),

  verifyPassword: (sessionId: string, password: string) =>
    api.post<{ data: { ok: boolean; title: string } }>(
      `/api/sessions/${sessionId}/verify-password`,
      { password }
    ),

  vapidKey: () => api.get<{ data: { public_key: string } }>('/api/push/vapid'),
  pushSubscribe: (sessionId: string, sub: PushSubscriptionJSON) =>
    api.post(`/api/sessions/${sessionId}/push-subscribe`, sub),

  join: (sessionId: string, password: string, displayName: string, level = 0, isTemp = false) =>
    api.post<{ data: { player_id: string; display_name: string } }>(
      `/api/sessions/${sessionId}/join`,
      { password, display_name: displayName, level, is_temp: isTemp }
    ),

  getView: (sessionId: string) =>
    api.get<{ data: SessionView }>(`/api/sessions/${sessionId}`),

  // 前台報名(需登入):報名/改留言/帶家人、取消、查自己的狀態
  signup: (sessionId: string, message: string, familyNames: string[] = []) =>
    api.post<{ data: { status: string; message: string; family_names: string[] } }>(
      `/api/sessions/${sessionId}/signup`, { message, family_names: familyNames }),
  cancelSignup: (sessionId: string) =>
    api.delete(`/api/sessions/${sessionId}/signup`),
  mySignup: (sessionId: string) =>
    api.get<{ data: { status: 'none' | 'pending' | 'member'; message?: string; family_names?: string[] } }>(
      `/api/sessions/${sessionId}/signup`),

  getPlayers: (sessionId: string) =>
    api.get<{ data: SessionPlayer[] }>(`/api/sessions/${sessionId}/players`),

  // as_player (optional): act on behalf of one of my approved family members
  joinPlaying: (sessionId: string, courtId: string, position: number, asPlayer?: string) =>
    api.post(`/api/sessions/${sessionId}/courts/${encodeURIComponent(courtId)}/join-playing`, {
      position,
      as_player: asPlayer,
    }),

  joinQueue: (sessionId: string, courtId: string, asPlayer?: string) =>
    api.post(`/api/sessions/${sessionId}/courts/${encodeURIComponent(courtId)}/join-queue`, {
      as_player: asPlayer,
    }),

  leaveQueue: (sessionId: string, courtId: string, asPlayer?: string) =>
    api.post(`/api/sessions/${sessionId}/courts/${encodeURIComponent(courtId)}/leave-queue`, {
      as_player: asPlayer,
    }),

  leavePlaying: (sessionId: string, courtId: string, asPlayer?: string) =>
    api.post(`/api/sessions/${sessionId}/courts/${encodeURIComponent(courtId)}/leave-playing`, {
      as_player: asPlayer,
    }),

  voteEnd: (sessionId: string, courtId: string, asPlayer?: string) =>
    api.post<{ data: { ended: boolean; votes: number; needed: number } }>(
      `/api/sessions/${sessionId}/courts/${encodeURIComponent(courtId)}/vote-end`,
      { as_player: asPlayer }
    ),

  addFamily: (sessionId: string, name: string, level: number, avatarUrl: string) =>
    api.post<{ data: SessionPlayer }>(`/api/sessions/${sessionId}/family`, {
      name,
      level,
      avatar_url: avatarUrl,
    }),

  removeFamily: (sessionId: string, playerId: string) =>
    api.delete(`/api/sessions/${sessionId}/family/${playerId}`),
}

// ── 檢舉 / 封鎖(App Store 1.2:UGC 要能檢舉不當內容、封鎖濫用者)──

export type ReportReason = 'inappropriate' | 'harassment' | 'spam' | 'other'

// 封鎖名單一筆。player 型 ref = 對方的 account_ref(沒帳號的人 = "s:" + 那場的 player_id,只在那場有效);
// org 型 ref = org_id。name / avatar_url 是封鎖當下的快照,給封鎖名單顯示
export interface Block {
  type: 'player' | 'org'
  ref: string
  name: string
  avatar_url?: string
  created_at: string
}

export const moderationApi = {
  // target_type=player 要帶 player_id(那場的 session player_id);session = 檢舉這個團(團名/簡介/公告)
  report: (v: { targetType: 'player' | 'session'; sessionId: string; playerId?: string; reason: ReportReason; detail?: string }) =>
    api.post<{ data: { reported: boolean } }>('/api/reports', {
      target_type: v.targetType,
      session_id: v.sessionId,
      player_id: v.playerId,
      reason: v.reason,
      detail: v.detail || undefined,
    }),
  blocks: () => api.get<{ data: Block[] }>('/api/players/me/blocks'),
  // 封鎖玩家帶那場的 player_id;封鎖團主只帶 session_id(後端從場次找 org_id)。已封鎖過 = 冪等回原本那筆
  block: (v: { type: 'player'; sessionId: string; playerId: string } | { type: 'org'; sessionId: string }) =>
    api.post<{ data: Block }>('/api/players/me/blocks', {
      type: v.type,
      session_id: v.sessionId,
      player_id: v.type === 'player' ? v.playerId : undefined,
    }),
  // ref 可能是 "s:<player_id>",一定要 encode
  unblock: (type: Block['type'], ref: string) =>
    api.delete<{ data: { removed: boolean } }>(
      `/api/players/me/blocks/${type}/${encodeURIComponent(ref)}`
    ),
}
