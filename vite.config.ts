import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 5174 — keeps 5173 free for the admin app (Google OAuth redirect).
  server: { port: 5174, strictPort: true },
})
