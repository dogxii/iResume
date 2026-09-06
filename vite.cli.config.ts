import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  publicDir: false,
  build: {
    emptyOutDir: true,
    outDir: resolve(rootDir, 'packages/cli/dist/api'),
    ssr: resolve(rootDir, 'src/cli-api.ts'),
    rollupOptions: {
      output: {
        entryFileNames: 'cli-api.mjs',
      },
    },
  },
})
