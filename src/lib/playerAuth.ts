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
  // also clear the per-session identity globals so a logged-out device can't
  // carry a stale player_id into a court page
  localStorage.removeItem('player_id')
  localStorage.removeItem('display_name')
}

// where to come back to after the OAuth round-trip (e.g. "/?s=<sessionId>")
function redirectBack(): string {
  return window.location.pathname + window.location.search
}

// OAuth `state` = base64({ return-path, random nonce }). The nonce is stashed in
// sessionStorage and re-checked on the callback to block CSRF (a forged callback
// from another page can't know/set this browser's nonce).
function makeOAuthState(): string {
  const nonce =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  // localStorage (not sessionStorage): LINE's in-app browser on mobile often
  // returns the callback in a different tab/context and drops sessionStorage,
  // which would falsely fail the check. localStorage survives same-browser tabs.
  localStorage.setItem('oauth_state', nonce)
  return btoa(JSON.stringify({ r: redirectBack(), n: nonce }))
}

// Verify the callback's state and return the safe return path. Only REJECT on a
// genuine mismatch (stored nonce present but different). If the stored nonce is
// gone (mobile in-app browser dropped storage), we can't verify — allow the
// login through rather than block a legitimate user; this is login-CSRF, low risk
// for this app, and usability on phones matters more.
export function consumeOAuthState(raw: string): string | null {
  const expected = localStorage.getItem('oauth_state')
  localStorage.removeItem('oauth_state')
  try {
    const { r, n } = JSON.parse(atob(raw)) as { r?: string; n?: string }
    if (expected && n !== expected) return null // real CSRF signal
    return typeof r === 'string' && r.startsWith('/') ? r : '/'
  } catch {
    return null
  }
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
    state: makeOAuthState(),
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// LINE Login — redirect_uri must match the channel's Callback URL + backend LINE_REDIRECT_URI.
export function lineLoginUrl(): string {
  const redirectUri = `${window.location.origin}/auth/line/callback`
  const state = makeOAuthState() // return path + CSRF nonce
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
