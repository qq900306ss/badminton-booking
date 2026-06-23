import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryPage } from './pages/EntryPage'
import { CourtPage } from './pages/CourtPage'
import { LobbyPage } from './pages/LobbyPage'
import { ToastProvider } from './components/Toast'

const qc = new QueryClient()

// "/" shows the entry flow when a session is in the URL (?s=…), else the lobby.
function Home() {
  const [params] = useSearchParams()
  return params.get('s') ? <EntryPage /> : <LobbyPage />
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/court/:sessionId" element={<CourtPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
