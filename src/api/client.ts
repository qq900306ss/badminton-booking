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
  avatar_url?: string
  email?: string
  created_at: string
}

export const playerApi = {
  google: (code: string) =>
    api.post<{ data: { token: string; player: Player } }>('/api/auth/player/google', { code }),
  line: (code: string) =>
    api.post<{ data: { token: string; player: Player } }>('/api/auth/player/line', { code }),
  me: () => api.get<{ data: Player }>('/api/players/me'),
  updateJoinName: (joinName: string) =>
    api.put<{ data: Player }>('/api/players/me', { join_name: joinName }),
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
}

export interface SessionView {
  session_id: string
  title: string
  num_courts: number
  status: string
  start_at?: string
  end_at?: string
  queue_open_at?: string
  courts: CourtView[]
}

export interface SessionSummary {
  session_id: string
  title: string
  num_courts: number
  status: string
  start_at?: string
  end_at?: string
  queue_open_at?: string
  opened_at: string
}

export interface SessionPlayer {
  player_id: string
  display_name: string
  level: number
  claimed: boolean
  is_temp: boolean
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

  joinPlaying: (sessionId: string, courtId: string, position: number) =>
    api.post(`/api/sessions/${sessionId}/courts/${encodeURIComponent(courtId)}/join-playing`, {
      position,
    }),

  joinQueue: (sessionId: string, courtId: string) =>
    api.post(`/api/sessions/${sessionId}/courts/${encodeURIComponent(courtId)}/join-queue`),

  leaveQueue: (sessionId: string, courtId: string) =>
    api.post(`/api/sessions/${sessionId}/courts/${encodeURIComponent(courtId)}/leave-queue`),

  leavePlaying: (sessionId: string, courtId: string) =>
    api.post(`/api/sessions/${sessionId}/courts/${encodeURIComponent(courtId)}/leave-playing`),
}
