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
      // Jitsi iframe (meet.jit.si) can fail/blank when dev server is
      // cross-origin isolated. Keep COOP/COEP relaxed in dev so external
      // conferencing iframe can be embedded reliably.
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  },
  optimizeDeps: {
    // Keep sqlite wasm out of pre-bundling due worker/runtime specifics.
    exclude: ['@sqlite.org/sqlite-wasm'],
    // Explicitly pre-bundle packages that benefit from optimization,
    // including MediaPipe modules required by tfjs pose-detection.
    include: [
      'reactflow',
      'html2canvas',
      'zustand',
      'use-sync-external-store/shim/with-selector',
      'driver.js',
      'peerjs',
      '@mediapipe/hands',
      '@mediapipe/pose',
      // Studio Model state machine dependencies; pre-bundle to prevent
      // transient "Outdated Optimize Dep" fetch errors in dev.
      'xstate',
      '@xstate/react',
    ],
  },
  worker: {
    format: 'es',
    plugins: () => [react()],
  },
  envPrefix: ['VITE_', 'TAURI_'],
})
