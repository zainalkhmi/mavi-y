import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Tauri-specific configuration
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    // Prevent stale pre-bundled dep hash errors ("Outdated Optimize Dep")
    // on heavy modules used by VSM route.
    exclude: ['@sqlite.org/sqlite-wasm', 'reactflow', 'html2canvas'],
  },
  worker: {
    format: 'es',
    plugins: () => [react()],
  },
  envPrefix: ['VITE_', 'TAURI_'],
})
