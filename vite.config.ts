import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        style: resolve(__dirname, 'src/style.css'),
        lastfm: resolve(__dirname, 'src/lastfm/index.tsx'),
      },
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
  server: {
    origin: 'http://localhost:5173',
  },
})
