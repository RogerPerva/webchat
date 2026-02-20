import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'
import './index.css'
import App from './App.tsx'

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY

if (!recaptchaSiteKey) {
  console.error('[reCAPTCHA] VITE_RECAPTCHA_SITE_KEY no está definida. Revisa tu archivo .env.')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {recaptchaSiteKey ? (
      <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
        <App />
      </GoogleReCaptchaProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)
