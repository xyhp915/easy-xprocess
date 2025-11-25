import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    entry: 'src/main/main.ts',
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        external: ['node-pty'],
      },
    },
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    input: {
      preload: resolve(__dirname, 'src/preload/index.ts'),
    },
    build: {
      outDir: 'dist/preload',
    },
  },
})

