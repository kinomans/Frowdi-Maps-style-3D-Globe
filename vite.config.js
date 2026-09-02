import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cesium()],
  root: 'src',
  base: '',
  publicDir: '../public',
  // Keep .env at the repo root (next to package.json) instead of inside src/.
  envDir: '..',
  build: {
    outDir: '../dist',
  },
  server: {
    port: 1234,
    open: true,
  },
})
