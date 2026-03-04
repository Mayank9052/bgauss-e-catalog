import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:5053",
        changeOrigin: true
      }
    }
  }
})