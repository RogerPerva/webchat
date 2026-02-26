/// <reference types="vite/client" />

interface Window {
  IWAChatConfig?: {
    webhookUrl?: string
    recaptchaSiteKey?: string
  }
}
