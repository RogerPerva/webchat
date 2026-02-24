import { WEBHOOK_URL } from '../chat.config'

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
}

export interface AppointmentData {
  name: string
  phone: string
  email: string
  appType: string
  budget: string
  description: string
}

/** Contexto de sesión que acompaña cada mensaje enviado a n8n */
export interface ChatContext {
  chatId: number
  isNewConsultation: boolean
  userName: string
}

// ── ID de sesión ──────────────────────────────────────────────────────────────
// Se genera una sola vez al cargar el módulo y representa la sesión actual.
// En consultas nuevas se usa como folio; en existentes el usuario lo reemplaza.

export const CHAT_ID = Math.floor(Math.random() * 900000000) + 100000000

// ── API ───────────────────────────────────────────────────────────────────────

function buildPayload(text: string, ctx: ChatContext, recaptchaToken?: string) {
  return {
    message: {
      from: { id: ctx.chatId, first_name: ctx.userName },
      chat: { id: ctx.chatId, first_name: ctx.userName, type: 'private' },
      text,
    },
    nueva_consulta: ctx.isNewConsultation,
    ...(recaptchaToken ? { recaptchaToken } : {}),
  }
}

export async function sendMessage(text: string, ctx: ChatContext, recaptchaToken?: string): Promise<string> {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload(text, ctx, recaptchaToken)),
  })

  if (!response.ok) {
    throw new Error(`Error del servidor: ${response.status}`)
  }

  const raw = await response.text()

  let data: Record<string, unknown>
  try {
    data = JSON.parse(raw)
  } catch {
    return raw
  }

  return (data.message ?? data.output ?? data.text ?? raw) as string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function buildAppointmentText(data: AppointmentData): string {
  let text = `Mi nombre es ${data.name}. Mi teléfono es ${data.phone} y mi correo es ${data.email}. Tipo de aplicación: ${data.appType}.`
  if (data.budget) text += ` Mi presupuesto es ${data.budget}.`
  text += ` ${data.description}`
  return text
}
