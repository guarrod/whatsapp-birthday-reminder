import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkgVersion = JSON.parse(readFileSync('./package.json', 'utf-8')).version
const gitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
})()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/birthdays/',
  define: {
    __APP_VERSION__: JSON.stringify(pkgVersion),
    __GIT_HASH__: JSON.stringify(gitHash),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
