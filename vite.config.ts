import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { gameRelayPlugin } from './server/gameRelay'
import { jevProxyPlugin } from './server/jevProxy'
import { libraryProxyPlugin } from './server/libraryProxy'

function copyWebOsAssets() {
  return {
    name: 'copy-webos-assets',
    closeBundle() {
      const webosDir = resolve(__dirname, 'webos')
      const distDir = resolve(__dirname, 'dist')

      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true })
      }

      cpSync(webosDir, distDir, { recursive: true })
      copyFileSync(
        resolve(webosDir, 'appinfo.json'),
        resolve(distDir, 'appinfo.json'),
      )
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    copyWebOsAssets(),
    jevProxyPlugin(),
    libraryProxyPlugin(),
    gameRelayPlugin(),
  ],
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
