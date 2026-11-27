import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { applyConnectionPolicy } from './scripts/web-csp.mjs'

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    { name: 'sipro-connection-policy', transformIndexHtml(html) { return applyConnectionPolicy(html, mode) } },
  ],
}))
