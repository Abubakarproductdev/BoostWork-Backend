import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// API calls go straight to API_BASE (src/lib/utils.js), so no dev proxy is needed.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
