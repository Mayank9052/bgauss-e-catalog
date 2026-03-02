import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    open: true,
    proxy: {
      '/api': {
        target: 'https://localhost:7204',   // 👈 match backend port from launchSettings
        changeOrigin: true,
        secure: false
      }
    }
  }
})