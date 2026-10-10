import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Env vars live in one root-level .env shared with the backend, not
  // frontend/.env — see REPO_ROOT/.env.example.
  const rootDir = path.resolve(__dirname, '..')
  const env = loadEnv(mode, rootDir, '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:8000'

  return {
    envDir: rootDir,
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/graphql': { target: apiUrl, changeOrigin: true },
        '/media': { target: apiUrl, changeOrigin: true },
      },
    },
  }
})
