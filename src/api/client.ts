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
}

export interface CourtView {
  court_id: string
  court_num: number
  status: 'empty' | 'playing'
  playing: PlayerSlot[]
  queue: PlayerSlot[]
}

export interface SessionView {
  session_id: string
  num_courts: number
  status: string
  courts: CourtView[]
}

export interface SessionPlayer {
  player_id: string
  display_name: string
  is_temp: boolean
}

export const sessionApi = {
  join: (sessionId: string, password: string, displayName: string, isTemp = false) =>
    api.post<{ data: { player_id: string; display_name: string } }>(
      `/api/sessions/${sessionId}/join`,
      { password, display_name: displayName, is_temp: isTemp }
    ),

  getView: (sessionId: string) =>
    api.get<{ data: SessionView }>(`/api/sessions/${sessionId}`),

  getPlayers: (sessionId: string) =>
    api.get<{ data: SessionPlayer[] }>(`/api/sessions/${sessionId}/players`),

  joinPlaying: (sessionId: string, courtId: string) =>
    api.post(`/api/sessions/${sessionId}/courts/${courtId}/join-playing`),

  joinQueue: (sessionId: string, courtId: string) =>
    api.post(`/api/sessions/${sessionId}/courts/${courtId}/join-queue`),

  leaveQueue: (sessionId: string, courtId: string) =>
    api.post(`/api/sessions/${sessionId}/courts/${courtId}/leave-queue`),
}
