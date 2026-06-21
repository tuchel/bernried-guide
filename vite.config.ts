import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Production is served from GitHub Pages at /bernried-guide/; dev stays at root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/bernried-guide/' : '/',
  plugins: [react(), tailwindcss()],
}))
