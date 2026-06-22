import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export const api = axios.create({ baseURL: BASE })

// attach player_id from localStorage on every request
api.interceptors.request.use((config) => {
  const playerId = localStorage.getItem('player_id')
  if (playerId) config.headers['X-Player-ID'] = playerId
  return config
})

export interface PlayerSlot {
  player_id: string
  display_name: string
  level: number
  games: number
}

export interface CourtView {
  court_id: string
  court_num: number
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

  join: (sessionId: string, password: string, displayName: string, level = 0, isTemp = false) =>
    api.post<{ data: { player_id: string; display_name: string } }>(
      `/api/sessions/${sessionId}/join`,
      { password, display_name: displayName, level, is_temp: isTemp }
    ),

  getView: (sessionId: string) =>
    api.get<{ data: SessionView }>(`/api/sessions/${sessionId}`),

  getPlayers: (sessionId: string) =>
    api.get<{ data: SessionPlayer[] }>(`/api/sessions/${sessionId}/players`),

  joinPlaying: (sessionId: string, courtId: string) =>
    api.post(`/api/sessions/${sessionId}/courts/${encodeURIComponent(courtId)}/join-playing`),

  joinQueue: (sessionId: string, courtId: string) =>
    api.post(`/api/sessions/${sessionId}/courts/${encodeURIComponent(courtId)}/join-queue`),

  leaveQueue: (sessionId: string, courtId: string) =>
    api.post(`/api/sessions/${sessionId}/courts/${encodeURIComponent(courtId)}/leave-queue`),
}
