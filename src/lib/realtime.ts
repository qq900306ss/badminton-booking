// real-time: connect to a session's WebSocket room. The server sends a small
// nudge on any change, plus a targeted "removed" event. Auto-reconnects.
export type RTMessage =
  | { t: 'changed' }
  | { t: 'removed'; player: string; msg: string }

export function connectSessionWS(sessionId: string, onMessage: (m: RTMessage) => void): () => void {
  const base = (import.meta.env.VITE_API_URL || '').replace(/^http/, 'ws')
  if (!base || !sessionId) return () => {}
  let ws: WebSocket | null = null
  let closed = false
  let retry: ReturnType<typeof setTimeout> | undefined

  function open() {
    if (closed) return
    try {
      ws = new WebSocket(`${base}/api/sessions/${sessionId}/ws`)
    } catch {
      schedule()
      return
    }
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data))
      } catch {
        /* ignore malformed */
      }
    }
    ws.onclose = () => schedule()
    ws.onerror = () => {
      try {
        ws?.close()
      } catch {
        /* ignore */
      }
    }
  }
  function schedule() {
    if (closed) return
    clearTimeout(retry)
    retry = setTimeout(open, 2500)
  }

  open()
  return () => {
    closed = true
    clearTimeout(retry)
    try {
      ws?.close()
    } catch {
      /* ignore */
    }
  }
}
