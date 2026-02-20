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

const WEBHOOK_URL =
  import.meta.env.VITE_N8N_WEBHOOK_URL ||
  'https://iwaconsolti.app.n8n.cloud/webhook/iwa-ai'

const IWA_NUMBER = Math.floor(Math.random() * 900000000) + 100000000
let userFirstName = 'Visitante'

export function setUserName(name: string) {
  userFirstName = name || 'Visitante'
}

function buildPayload(text: string, recaptchaToken?: string) {
  return {
    message: {
      from: { id: IWA_NUMBER, first_name: userFirstName },
      chat: { id: IWA_NUMBER, first_name: userFirstName, type: 'private' },
      text,
    },
    ...(recaptchaToken ? { recaptchaToken } : {}),
  }
}

export async function sendMessage(text: string, recaptchaToken?: string): Promise<string> {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload(text, recaptchaToken)),
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

export function buildAppointmentText(data: AppointmentData): string {
  let text = `Mi nombre es ${data.name}. Mi teléfono es ${data.phone} y mi correo es ${data.email}. Tipo de aplicación: ${data.appType}.`
  if (data.budget) text += ` Mi presupuesto es ${data.budget}.`
  text += ` ${data.description}`
  return text
}
