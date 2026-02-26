import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve, join } from 'path'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'

/**
 * Injects the generated CSS into the JS bundle as __IWA_WIDGET_CSS__
 * so widget.tsx can load it inside a Shadow DOM, isolating all styles
 * from the host page (WordPress, etc.).
 *
 * Uses writeBundle (post-emit) to guarantee the CSS file already exists
 * when we read and inline it into the JS.
 */
function injectCssIntoShadowDom(): Plugin {
  const outDir = 'dist-widget'
  const jsFile = 'iwa-chat-widget.js'
  const cssFile = 'iwa-chat-widget.css'

  return {
    name: 'inject-css-into-shadow-dom',
    apply: 'build',
    // writeBundle runs after all files are written to disk
    writeBundle() {
      const jsPath = join(outDir, jsFile)
      const cssPath = join(outDir, cssFile)

      if (!existsSync(cssPath) || !existsSync(jsPath)) return

      const css = readFileSync(cssPath, 'utf-8')
      const js = readFileSync(jsPath, 'utf-8')

      // Escape backticks and template literal syntax inside the CSS string
      const escaped = css
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${')

      // Replace the placeholder string injected via vite define
      const patched = js.replace(
        '"__CSS_PLACEHOLDER__"',
        `\`${escaped}\``
      )

      writeFileSync(jsPath, patched, 'utf-8')

      // Remove the standalone CSS file — it's now embedded in the JS
      unlinkSync(cssPath)

      console.log('[inject-css-into-shadow-dom] CSS inlined into JS ✓')
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), injectCssIntoShadowDom()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    // Placeholder replaced at build time by the injectCssIntoShadowDom plugin
    '__IWA_WIDGET_CSS__': '"__CSS_PLACEHOLDER__"',
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
