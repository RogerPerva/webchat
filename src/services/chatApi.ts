import { WEBHOOK_URL, FOLIO_LENGTH } from '../chat.config'

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
  company: string
  appType: string
  budget: string
  description: string
  canInvest: string
}

/**
 * Valor de `nueva_consulta` enviado al backend.
 * - `new`: primer mensaje de una conversación nueva
 * - `resume`: usuario ingresó folio de consulta existente → dispara envío de OTP
 * - `otp_verify`: usuario ingresó OTP → valida y abre sesión
 * - `continue`: mensaje normal con sesión verificada
 */
export type ChatIntent = 'new' | 'resume' | 'otp_verify' | 'continue'

/** Contexto de sesión que acompaña cada mensaje enviado a n8n */
export interface ChatContext {
  folio: string
  intent: ChatIntent
  userName: string
}

// ── Folio de sesión ───────────────────────────────────────────────────────────
// 10 dígitos numéricos generados con CSPRNG.

export function generateFolio(): string {
  const arr = new Uint32Array(FOLIO_LENGTH)
  crypto.getRandomValues(arr)
  return Array.from(arr, (n) => (n % 10).toString()).join('')
}

// ── Session token (LocalStorage) ──────────────────────────────────────────────
// n8n emite un session_token plano tras verificar el OTP (o al crear un chat
// nuevo). Se guarda aquí y se reenvía en cada request para que n8n valide la
// sesión contra el hash guardado en su lado.

const SESSION_TOKEN_KEY = 'iwa_session_token'

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setSessionToken(token: string): void {
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token)
  } catch {
    /* localStorage no disponible */
  }
}

export function clearSessionToken(): void {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY)
  } catch {
    /* localStorage no disponible */
  }
}

// ── API ───────────────────────────────────────────────────────────────────────

interface BuildPayloadOptions {
  text?: string
  ctx: ChatContext
  recaptchaToken?: string
  otp?: string
  extra?: Record<string, string>
}

function buildPayload({ text, ctx, recaptchaToken, otp, extra }: BuildPayloadOptions) {
  const folioId = parseFolioId(ctx.folio)
  const sessionToken = getSessionToken()
  return {
    message: {
      from: { id: folioId, first_name: ctx.userName },
      chat: { id: folioId, first_name: ctx.userName, type: 'private' },
      text: text ?? '',
    },
    folio: ctx.folio,
    nueva_consulta: ctx.intent,
    ...(recaptchaToken ? { recaptchaToken } : {}),
    ...(otp ? { otp } : {}),
    ...(sessionToken ? { session_token: sessionToken } : {}),
    ...(extra ?? {}),
  }
}

// Convierte el folio string a número para mantener el formato del campo id
// esperado por n8n. Si el folio empieza con 0s se pierde precisión pero el
// campo `folio` del payload sigue siendo la fuente de verdad.
function parseFolioId(folio: string): number {
  const n = Number(folio)
  return Number.isFinite(n) ? n : 0
}

export interface SendMessageResult {
  reply: string
  sessionExpired?: boolean
  otpRequired?: boolean
  verified?: boolean
}

async function postToWebhook(payload: Record<string, unknown>): Promise<Response> {
  return fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function sendMessage(
  text: string,
  ctx: ChatContext,
  recaptchaToken?: string,
  extra?: Record<string, string>,
): Promise<SendMessageResult> {
  const response = await postToWebhook(buildPayload({ text, ctx, recaptchaToken, extra }))
  const raw = await response.text()

  // 404 = sesión inválida / folio no existe. Limpiamos el token para que el
  // próximo ciclo no lo reenvíe.
  if (response.status === 404) {
    clearSessionToken()
    return { reply: extractReply(raw), sessionExpired: true }
  }

  if (!response.ok) {
    throw new Error(`Error del servidor: ${response.status}`)
  }

  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    if (typeof data.session_token === 'string' && data.session_token.length > 0) {
      setSessionToken(data.session_token)
    }
    const reply = (data.message ?? data.output ?? data.text ?? raw) as string
    return { reply }
  } catch {
    return { reply: raw }
  }
}

export type OtpErrorType = 'RATE_LIMITED'

export interface RequestOtpResult {
  reply: string
  errorType?: OtpErrorType
}

/** Dispara el envío del OTP al correo registrado del folio. */
export async function requestOtp(
  folio: string,
  recaptchaToken?: string,
): Promise<RequestOtpResult> {
  const ctx: ChatContext = { folio, intent: 'resume', userName: 'Visitante' }
  const response = await postToWebhook(buildPayload({ ctx, recaptchaToken }))

  if (!response.ok) {
    throw new Error(`Error del servidor: ${response.status}`)
  }

  const raw = await response.text()
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    const reply = (data.message ?? data.output ?? data.text ?? raw) as string
    const errorType = data.errorType === 'RATE_LIMITED' ? ('RATE_LIMITED' as const) : undefined
    return { reply, errorType }
  } catch {
    return { reply: raw }
  }
}

/** Envía el OTP ingresado por el usuario para validarlo server-side. */
export async function verifyOtp(
  folio: string,
  otp: string,
  recaptchaToken?: string,
): Promise<boolean> {
  const ctx: ChatContext = { folio, intent: 'otp_verify', userName: 'Visitante' }
  const response = await postToWebhook(buildPayload({ ctx, otp, recaptchaToken }))

  if (!response.ok) return false

  const raw = await response.text()
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    const verified = data.verified === true
    if (verified && typeof data.session_token === 'string' && data.session_token.length > 0) {
      setSessionToken(data.session_token)
    }
    return verified
  } catch {
    return false
  }
}

function extractReply(raw: string): string {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    return (data.message ?? data.output ?? data.text ?? raw) as string
  } catch {
    return raw
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function buildAppointmentText(data: AppointmentData): string {
  let text = `Mi nombre es ${data.name}`
  if (data.company) text += `, de la empresa ${data.company}`
  text += `. Mi teléfono es ${data.phone} y mi correo es ${data.email}. ${data.appType}.`
  if (data.budget) text += ` Mi presupuesto es ${data.budget}.`
  text += ` ${data.description}`
  return text
}
