import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    open: true,   // 🔥 THIS OPENS BROWSER
    proxy: {
      '/api': {
        target: 'http://localhost:5176',
        changeOrigin: true
      }
    }
  }
})