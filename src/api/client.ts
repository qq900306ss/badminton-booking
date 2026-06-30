import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export const api = axios.create({ baseURL: BASE })

// attach the player JWT on every request (X-Player-ID is gone — pure JWT now)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('player_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
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
  created_at: string
}

export const playerApi = {
  google: (code: string) =>
    api.post<{ data: { token: string; player: Player } }>('/api/auth/player/google', { code }),
  line: (code: string) =>
    api.post<{ data: { token: string; player: Player } }>('/api/auth/player/line', { code }),
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
}

export interface PlayerSlot {
  player_id: string
  display_name: string
  level: number
  games: number
  avatar_url?: string
}

export interface CourtView {
  court_id: string
  court_num: number
  name?: string
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
  title: string
  num_courts: number
  status: string
  start_at?: string
  end_at?: string
  queue_open_at?: string
  contact_url?: string
  avatar_url?: string // 團主頭像(emoji 或照片網址),空=預設 🐰
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
