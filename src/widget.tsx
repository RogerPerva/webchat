import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'
import './widget.css'
import FloatingChatButton from './components/FloatingChatButton'

// __IWA_WIDGET_CSS__ is injected at build time by the vite.config.widget.ts plugin
declare const __IWA_WIDGET_CSS__: string

console.log('[IWA Chat] Widget cargado', window.IWAChatConfig)
const config = window.IWAChatConfig

if (!config?.webhookUrl) {
  console.error('[IWA Chat] webhookUrl no está configurado en window.IWAChatConfig')
}

// Host element — only acts as a Shadow DOM anchor, invisible itself
const host = document.createElement('div')
host.id = 'iwa-chat-widget'
document.body.appendChild(host)

// Shadow root isolates all styles from the host page (WordPress, etc.)
const shadow = host.attachShadow({ mode: 'open' })

// Inject widget CSS inside the shadow root so it never leaks out or gets overridden
const style = document.createElement('style')
style.textContent = typeof __IWA_WIDGET_CSS__ !== 'undefined' ? __IWA_WIDGET_CSS__ : ''
shadow.appendChild(style)

// React mounts inside the shadow root
const reactContainer = document.createElement('div')
shadow.appendChild(reactContainer)

const hasRecaptcha = !!config?.recaptchaSiteKey

createRoot(reactContainer).render(
  <StrictMode>
    {hasRecaptcha ? (
      <GoogleReCaptchaProvider reCaptchaKey={config!.recaptchaSiteKey!}>
        <FloatingChatButton hasRecaptchaProvider />
      </GoogleReCaptchaProvider>
    ) : (
      <FloatingChatButton hasRecaptchaProvider={false} />
    )}
  </StrictMode>,
)
