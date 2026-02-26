import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'
import './widget.css'
import FloatingChatButton from './components/FloatingChatButton'

console.log('[IWA Chat] Widget cargado', window.IWAChatConfig)
const config = window.IWAChatConfig

if (!config?.webhookUrl) {
  console.error('[IWA Chat] webhookUrl no está configurado en window.IWAChatConfig')
}

const container = document.createElement('div')
container.id = 'iwa-chat-widget'
document.body.appendChild(container)

const hasRecaptcha = !!config?.recaptchaSiteKey

createRoot(container).render(
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
