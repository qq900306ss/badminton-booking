import type { Player } from '../api/client'

// drop-in player auth: token + account stored in localStorage.
const TOKEN_KEY = 'player_token'
const PLAYER_KEY = 'player_account'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const LINE_CHANNEL_ID = import.meta.env.VITE_LINE_CHANNEL_ID as string | undefined

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem(TOKEN_KEY)
}

export function getAccount(): Player | null {
  const raw = localStorage.getItem(PLAYER_KEY)
  return raw ? (JSON.parse(raw) as Player) : null
}

export function setAuth(token: string, player: Player) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(PLAYER_KEY, JSON.stringify(player))
}

// update the cached account (e.g. after editing the preferred join name), keep token
export function updateAccount(player: Player) {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(player))
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(PLAYER_KEY)
}

// where to come back to after the OAuth round-trip (e.g. "/?s=<sessionId>")
function redirectBack(): string {
  return window.location.pathname + window.location.search
}

// Google OAuth — redirect_uri MUST match the backend's GOOGLE_PLAYER_REDIRECT_URI
// (the booking origin + /auth/callback) and be registered in the Google client.
export function googleLoginUrl(): string {
  const redirectUri = `${window.location.origin}/auth/callback`
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID ?? '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state: redirectBack(),
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// LINE Login — redirect_uri must match the channel's Callback URL + backend LINE_REDIRECT_URI.
export function lineLoginUrl(): string {
  const redirectUri = `${window.location.origin}/auth/line/callback`
  // LINE requires a state param; stash the return path so the callback can resume.
  const state = btoa(redirectBack())
  sessionStorage.setItem('line_oauth_state', state)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_CHANNEL_ID ?? '',
    redirect_uri: redirectUri,
    scope: 'profile openid',
    state,
  })
  return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
}

export const authProvidersConfigured = {
  google: !!GOOGLE_CLIENT_ID,
  line: !!LINE_CHANNEL_ID,
}
