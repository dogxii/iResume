import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: rootDir,
  plugins: [react(), tailwindcss()],
  publicDir: false,
  build: {
    emptyOutDir: true,
    outDir: resolve(rootDir, 'packages/cli/dist/render'),
    rollupOptions: {
      input: resolve(rootDir, 'export.html'),
    },
  },
})
