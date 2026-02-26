import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist-widget',
    lib: {
      entry: resolve(__dirname, 'src/widget.tsx'),
      name: 'IWAChatWidget',
      fileName: () => 'iwa-chat-widget.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        assetFileNames: 'iwa-chat-widget.[ext]',
      },
    },
  },
})
