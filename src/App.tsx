import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryPage } from './pages/EntryPage'
import { CourtPage } from './pages/CourtPage'
import { LobbyPage } from './pages/LobbyPage'
import { AuthCallback } from './pages/AuthCallback'
import { LoginScreen } from './components/LoginScreen'
import { isLoggedIn } from './lib/playerAuth'
import { ToastProvider } from './components/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ConnectionBanner } from './components/ConnectionBanner'

const qc = new QueryClient()

// login is required up front: not logged in → login screen first; then the
// entry flow when a session is in the URL (?s=…), else the lobby.
function Home() {
  const [params] = useSearchParams()
  if (!isLoggedIn()) return <LoginScreen title="登入開始揪球 🏸" />
  return params.get('s') ? <EntryPage /> : <LobbyPage />
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <ErrorBoundary>
      <ToastProvider>
      <ConnectionBanner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth/callback" element={<AuthCallback provider="google" />} />
          <Route path="/auth/line/callback" element={<AuthCallback provider="line" />} />
          <Route path="/court/:sessionId" element={<CourtPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}
