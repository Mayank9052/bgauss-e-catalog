import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:5053",
        changeOrigin: true
      }
    }
  },

  build: {
    // Output to wwwroot so ASP.NET Core's MapFallbackToFile serves index.html
    outDir: '../BGAUSS.Api/wwwroot',
    emptyOutDir: false,
    sourcemap: false,
  },
});