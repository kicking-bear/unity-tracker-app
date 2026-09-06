import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// VITE_BASE must match the GitHub Pages repo name, e.g. '/unity-tracker-app/'
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // some shadcn CLI versions emit `from "cn"` instead of "@/lib/utils"
      cn: path.resolve(__dirname, './src/lib/utils.ts'),
    },
  },
})
