import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  sendMessage,
  buildAppointmentText,
  generateFolio,
  requestOtp,
  verifyOtp,
  clearSessionToken,
  type ChatMessage,
  type ChatContext,
  type AppointmentData,
  type BusySlot,
} from '../services/chatApi'
import {
  INITIAL_USER_MESSAGE,
  CALENDAR_TRIGGER,
  INVALID_FOLIO_TRIGGER,
  FAREWELL_TRIGGER,
  FAREWELL_COUNTDOWN_SECONDS,
  INACTIVITY_TIMEOUT_MS,
  EXISTING_TOPICS,
  FOLIO_LENGTH,
  OTP_LENGTH,
  OTP_RESEND_COOLDOWN_MS,
  OTP_ERROR_MESSAGE,
  OTP_RATE_LIMITED_MESSAGE,
  OTP_RATE_LIMIT_TTL_MS,
} from '../chat.config'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ChatMode = null | 'new' | 'existing'

export interface UseChatSessionOptions {
  executeRecaptcha?: ((action?: string) => Promise<string>) | null
}

export interface ChatSession {
  messages: ChatMessage[]
  input: string
  isLoading: boolean
  showSchedule: boolean
  showCalendar: boolean
  showRestart: boolean
  chatMode: ChatMode
  folioInput: string
  folioError: string
  folioConfirmed: boolean
  farewellCountdown: number | null
  inactivityClosed: boolean

  awaitingOtp: boolean
  otpInput: string
  otpError: string
  otpResendSeconds: number
  otpRateLimited: boolean
  otpRateLimitedMessage: string

  busySlots: BusySlot[]

  showFolioInput: boolean
  showOtpInput: boolean
  showTopicSelection: boolean
  inputDisabled: boolean
  inputPlaceholder: string

  setInput: (v: string) => void
  setFolioInput: (v: string) => void
  clearFolioError: () => void
  setOtpInput: (v: string) => void
  clearOtpError: () => void
  setShowSchedule: (v: boolean) => void
  handleNewConsultation: () => void
  handleExistingConsultation: () => void
  handleGoBack: () => void
  handleFolioSubmit: () => void
  handleOtpSubmit: () => void
  handleResendOtp: () => void
  handleTopicSelect: (message: string) => void
  handleSend: () => void
  handleKeyDown: (e: React.KeyboardEvent) => void
  handleDateTimeConfirm: (isoDate: string) => void
  handleScheduleSubmit: (data: AppointmentData) => void
  resetSession: () => void

  existingTopics: typeof EXISTING_TOPICS
  folioMessage: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function createMessage(text: string, sender: 'user' | 'bot'): ChatMessage {
  return { id: crypto.randomUUID(), text, sender, timestamp: new Date() }
}

// OTP: 3 letras A-Z (sin ambiguos) + 3 números (sin ambiguos). Display: XXX-XXX
const OTP_DISPLAY_REGEX = /^[A-HJ-NP-Z0-9]{3}-?[A-HJ-NP-Z0-9]{3}$/i

function normalizeOtp(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, OTP_LENGTH)
}

function formatOtpDisplay(raw: string): string {
  const n = normalizeOtp(raw)
  if (n.length <= 3) return n
  return `${n.slice(0, 3)}-${n.slice(3)}`
}

// Bloqueo de OTP por exceso de envíos: persiste en localStorage por folio.
const RATE_LIMIT_KEY_PREFIX = 'iwa_otp_blocked_'

function rateLimitKey(folio: string) {
  return `${RATE_LIMIT_KEY_PREFIX}${folio}`
}

function readRateLimit(folio: string): number | null {
  try {
    const raw = localStorage.getItem(rateLimitKey(folio))
    if (!raw) return null
    const expiresAt = Number(raw)
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      localStorage.removeItem(rateLimitKey(folio))
      return null
    }
    return expiresAt
  } catch {
    return null
  }
}

function writeRateLimit(folio: string, expiresAt: number): void {
  try {
    localStorage.setItem(rateLimitKey(folio), String(expiresAt))
  } catch {
    /* localStorage no disponible: bloqueo solo en memoria de sesión */
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useChatSession(options: UseChatSessionOptions = {}): ChatSession {
  const { executeRecaptcha } = options
  const [folio, setFolio] = useState(() => generateFolio())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showRestart, setShowRestart] = useState(false)
  const [chatMode, setChatMode] = useState<ChatMode>(null)
  const [folioInput, setFolioInput] = useState('')
  const [folioError, setFolioError] = useState('')
  const [folioConfirmed, setFolioConfirmed] = useState(false)
  const [, setHasReceivedFirstReply] = useState(false)
  const [farewellCountdown, setFarewellCountdown] = useState<number | null>(null)
  const [inactivityClosed, setInactivityClosed] = useState(false)

  const [busySlots, setBusySlots] = useState<BusySlot[]>([])

  const [awaitingOtp, setAwaitingOtp] = useState(false)
  const [otpInput, setOtpInputState] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpResendSeconds, setOtpResendSeconds] = useState(0)
  const [rateLimitedAt, setRateLimitedAt] = useState<number | null>(null)

  const ctxRef = useRef<ChatContext>({
    folio,
    intent: 'new',
    userName: 'Visitante',
  })

  const hasReceivedFirstReplyRef = useRef(false)
  const appointmentJustSubmitted = useRef(false)
  const farewellTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const otpResendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const folioMessage = useMemo(
    () => `Muchas gracias por haberte puesto en contacto con nosotros. Por favor, conserva este folio: ${folio}, este nos ayudará a continuar la conversación en caso de que se cierre o para futuras consultas.`,
    [folio],
  )

  // ── Reset de sesión ───────────────────────────────────────────────────────

  const resetSession = useCallback(() => {
    clearSessionToken()
    const newFolio = generateFolio()
    setFolio(newFolio)
    ctxRef.current = { folio: newFolio, intent: 'new', userName: 'Visitante' }
    setMessages([])
    setInput('')
    setIsLoading(false)
    setShowSchedule(false)
    setShowCalendar(false)
    setShowRestart(false)
    setChatMode(null)
    setFolioInput('')
    setFolioError('')
    setFolioConfirmed(false)
    setHasReceivedFirstReply(false)
    hasReceivedFirstReplyRef.current = false
    setFarewellCountdown(null)
    setInactivityClosed(false)
    setAwaitingOtp(false)
    setOtpInputState('')
    setOtpError('')
    setOtpResendSeconds(0)
    setRateLimitedAt(null)
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    if (otpResendTimerRef.current) {
      clearInterval(otpResendTimerRef.current)
      otpResendTimerRef.current = null
    }
  }, [])

  const startFarewellCountdown = useCallback(() => {
    if (farewellTimerRef.current) return
    setFarewellCountdown(FAREWELL_COUNTDOWN_SECONDS)
    farewellTimerRef.current = setInterval(() => {
      setFarewellCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(farewellTimerRef.current!)
          farewellTimerRef.current = null
          resetSession()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }, [resetSession])

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    inactivityTimerRef.current = setTimeout(() => {
      setInactivityClosed(true)
      setShowRestart(true)
      if (farewellTimerRef.current) {
        clearInterval(farewellTimerRef.current)
        farewellTimerRef.current = null
      }
      setFarewellCountdown(null)
      inactivityTimerRef.current = null
    }, INACTIVITY_TIMEOUT_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (farewellTimerRef.current) clearInterval(farewellTimerRef.current)
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      if (otpResendTimerRef.current) clearInterval(otpResendTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (rateLimitedAt === null) return
    const remaining = rateLimitedAt - Date.now()
    if (remaining <= 0) {
      setRateLimitedAt(null)
      return
    }
    const t = setTimeout(() => setRateLimitedAt(null), remaining)
    return () => clearTimeout(t)
  }, [rateLimitedAt])

  // ── reCAPTCHA ─────────────────────────────────────────────────────────────

  const getRecaptchaToken = useCallback(async (): Promise<string | undefined> => {
    if (!executeRecaptcha) return undefined
    try {
      return await executeRecaptcha('send_message')
    } catch {
      return undefined
    }
  }, [executeRecaptcha])

  // ── OTP resend cooldown ───────────────────────────────────────────────────

  const startOtpResendCooldown = useCallback(() => {
    setOtpResendSeconds(Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000))
    if (otpResendTimerRef.current) clearInterval(otpResendTimerRef.current)
    otpResendTimerRef.current = setInterval(() => {
      setOtpResendSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(otpResendTimerRef.current!)
          otpResendTimerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // ── Envío de mensajes ─────────────────────────────────────────────────────

  const appendMessage = (msg: ChatMessage) =>
    setMessages((prev) => [...prev, msg])

  const processBotReply = (reply: string) => {
    appendMessage(createMessage(reply, 'bot'))
    const lower = reply.toLowerCase()

    if (lower.includes(CALENDAR_TRIGGER)) setShowCalendar(true)
    if (lower.includes(INVALID_FOLIO_TRIGGER)) setShowRestart(true)
    if (lower.includes(FAREWELL_TRIGGER)) startFarewellCountdown()

    if (!hasReceivedFirstReplyRef.current) {
      hasReceivedFirstReplyRef.current = true
      setHasReceivedFirstReply(true)
      if (ctxRef.current.intent === 'new') setShowSchedule(true)
    }

    if (appointmentJustSubmitted.current) {
      appointmentJustSubmitted.current = false
      appendMessage(createMessage(folioMessage, 'bot'))
    }
  }

  const doSend = async (text: string, extra?: Record<string, string>) => {
    appendMessage(createMessage(text, 'user'))
    setInput('')
    setIsLoading(true)
    resetInactivityTimer()

    try {
      const token = await getRecaptchaToken()
      const { reply, sessionExpired, rateLimited, retryAfter, busySlots: newBusySlots } = await sendMessage(text, ctxRef.current, token, extra)
      if (newBusySlots) setBusySlots(newBusySlots)
      if (rateLimited) {
        const msg = retryAfter
          ? `Demasiadas peticiones. Reintenta en ${retryAfter}.`
          : 'Demasiadas peticiones. Intenta de nuevo en unos segundos.'
        appendMessage(createMessage(msg, 'bot'))
      } else if (sessionExpired) {
        // Sesion invalida: descartar cualquier flag pendiente (folio post-form,
        // primera respuesta, etc.) y mostrar el mensaje del bot tal cual.
        appointmentJustSubmitted.current = false
        appendMessage(createMessage(reply, 'bot'))
        setShowRestart(true)
      } else {
        processBotReply(reply)
        if (ctxRef.current.intent === 'new') {
          // Después del primer mensaje exitoso, toda conversación posterior es "continue".
          ctxRef.current = { ...ctxRef.current, intent: 'continue' }
        }
      }
    } catch {
      appendMessage(createMessage('Lo siento, hubo un error al conectar. Intenta de nuevo.', 'bot'))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleGoBack = useCallback(() => {
    setChatMode(null)
    setFolioInput('')
    setFolioError('')
    setFolioConfirmed(false)
    setAwaitingOtp(false)
    setOtpInputState('')
    setOtpError('')
    setOtpResendSeconds(0)
    setRateLimitedAt(null)
    if (otpResendTimerRef.current) {
      clearInterval(otpResendTimerRef.current)
      otpResendTimerRef.current = null
    }
  }, [])

  const handleNewConsultation = () => {
    clearSessionToken()
    ctxRef.current = { ...ctxRef.current, intent: 'new' }
    setChatMode('new')
    doSend(INITIAL_USER_MESSAGE)
  }

  const handleExistingConsultation = () => {
    clearSessionToken()
    ctxRef.current = { ...ctxRef.current, intent: 'resume' }
    setChatMode('existing')
  }

  const folioRegex = useMemo(
    () => new RegExp(`^\\d{${FOLIO_LENGTH}}$`),
    [],
  )

  const applyRateLimit = useCallback((folioValue: string) => {
    const expiresAt = Date.now() + OTP_RATE_LIMIT_TTL_MS
    writeRateLimit(folioValue, expiresAt)
    setRateLimitedAt(expiresAt)
  }, [])

  const requestOtpForFolio = useCallback(async (folioValue: string) => {
    setAwaitingOtp(true)
    setOtpError('')
    setIsLoading(true)
    try {
      const token = await getRecaptchaToken()
      const result = await requestOtp(folioValue, token)
      if (result.errorType === 'RATE_LIMITED') {
        applyRateLimit(folioValue)
      } else {
        startOtpResendCooldown()
      }
    } catch {
      setOtpError('No pudimos enviar el código. Intenta reenviar.')
    } finally {
      setIsLoading(false)
    }
  }, [getRecaptchaToken, startOtpResendCooldown, applyRateLimit])

  const handleFolioSubmit = () => {
    const folioValue = folioInput.trim()
    if (!folioValue || isLoading) return
    if (!folioRegex.test(folioValue)) {
      setFolioError(`El folio debe ser un número de ${FOLIO_LENGTH} dígitos.`)
      return
    }
    ctxRef.current = { ...ctxRef.current, folio: folioValue, intent: 'resume' }
    setFolio(folioValue)
    setFolioInput('')
    setFolioError('')
    setFolioConfirmed(true)

    const blockedUntil = readRateLimit(folioValue)
    if (blockedUntil !== null) {
      setAwaitingOtp(true)
      setRateLimitedAt(blockedUntil)
      return
    }

    void requestOtpForFolio(folioValue)
  }

  const setOtpInput = (raw: string) => {
    setOtpInputState(formatOtpDisplay(raw))
    if (otpError) setOtpError('')
  }

  const handleOtpSubmit = async () => {
    if (rateLimitedAt !== null) return
    const otp = normalizeOtp(otpInput)
    if (otp.length !== OTP_LENGTH || isLoading) return
    if (!OTP_DISPLAY_REGEX.test(otpInput)) {
      setOtpError(OTP_ERROR_MESSAGE)
      return
    }
    const otpFormatted = `${otp.slice(0, 3)}-${otp.slice(3)}`
    setIsLoading(true)
    try {
      const token = await getRecaptchaToken()
      const ok = await verifyOtp(ctxRef.current.folio, otpFormatted, token)
      if (ok) {
        ctxRef.current = { ...ctxRef.current, intent: 'continue' }
        setAwaitingOtp(false)
        setOtpInputState('')
        setOtpError('')
      } else {
        setOtpError(OTP_ERROR_MESSAGE)
      }
    } catch {
      setOtpError(OTP_ERROR_MESSAGE)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (otpResendSeconds > 0 || isLoading || rateLimitedAt !== null) return
    await requestOtpForFolio(ctxRef.current.folio)
  }

  const handleTopicSelect = (message: string) => {
    doSend(message)
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text || isLoading) return
    doSend(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleDateTimeConfirm = (isoDate: string) => {
    setShowCalendar(false)
    resetInactivityTimer()

    const date = new Date(isoDate)
    const formattedDate = date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const userMessage = `Tengo disponibilidad para la fecha: ${formattedDate}`
    const payloadMessage = `Tengo disponibilidad para la fecha: ${isoDate}`

    appendMessage(createMessage(userMessage, 'user'))
    setInput('')
    setIsLoading(true)

    getRecaptchaToken()
      .then((token) => sendMessage(payloadMessage, ctxRef.current, token))
      .then(({ reply, sessionExpired, rateLimited, retryAfter, busySlots: newBusySlots }) => {
        if (newBusySlots) setBusySlots(newBusySlots)
        if (rateLimited) {
          const msg = retryAfter
            ? `Demasiadas peticiones. Reintenta en ${retryAfter}.`
            : 'Demasiadas peticiones. Intenta de nuevo en unos segundos.'
          appendMessage(createMessage(msg, 'bot'))
        } else if (sessionExpired) {
          appointmentJustSubmitted.current = false
          appendMessage(createMessage(reply, 'bot'))
          setShowRestart(true)
        } else {
          processBotReply(reply)
        }
      })
      .catch(() => {
        appendMessage(createMessage('Lo siento, hubo un error al conectar. Intenta de nuevo.', 'bot'))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const handleScheduleSubmit = (data: AppointmentData) => {
    setShowSchedule(false)
    ctxRef.current = {
      ...ctxRef.current,
      userName: data.name.trim().split(/\s+/)[0] || 'Visitante',
    }
    appointmentJustSubmitted.current = true
    doSend(buildAppointmentText(data), { canInvest: data.canInvest, etapa: data.appType })
  }

  // ── Valores derivados ─────────────────────────────────────────────────────

  const showFolioInput = chatMode === 'existing' && !folioConfirmed
  const showOtpInput = chatMode === 'existing' && folioConfirmed && awaitingOtp
  const showTopicSelection =
    chatMode === 'existing' && folioConfirmed && !awaitingOtp && messages.length === 0
  const inputDisabled =
    chatMode === null ||
    showFolioInput ||
    showOtpInput ||
    showTopicSelection ||
    showSchedule ||
    showCalendar

  const inputPlaceholder =
    chatMode === null        ? 'Selecciona una opción arriba...' :
    showFolioInput           ? 'Ingresa tu folio arriba...' :
    showOtpInput             ? 'Ingresa el código enviado por correo...' :
    showTopicSelection       ? 'Selecciona un tema arriba...' :
    showSchedule             ? 'Completa el formulario arriba' :
    showCalendar             ? 'Selecciona fecha y hora arriba' :
                               'Escribe un mensaje...'

  return {
    messages,
    input,
    isLoading,
    showSchedule,
    showCalendar,
    showRestart,
    chatMode,
    folioInput,
    folioError,
    folioConfirmed,
    farewellCountdown,
    inactivityClosed,
    awaitingOtp,
    otpInput,
    otpError,
    otpResendSeconds,
    busySlots,
    otpRateLimited: rateLimitedAt !== null,
    otpRateLimitedMessage: OTP_RATE_LIMITED_MESSAGE,
    showFolioInput,
    showOtpInput,
    showTopicSelection,
    inputDisabled,
    inputPlaceholder,
    folioMessage,
    existingTopics: EXISTING_TOPICS,
    setInput,
    setFolioInput,
    clearFolioError: () => setFolioError(''),
    setOtpInput,
    clearOtpError: () => setOtpError(''),
    setShowSchedule,
    handleNewConsultation,
    handleExistingConsultation,
    handleGoBack,
    handleFolioSubmit,
    handleOtpSubmit,
    handleResendOtp,
    handleTopicSelect,
    handleSend,
    handleKeyDown,
    handleDateTimeConfirm,
    handleScheduleSubmit,
    resetSession,
  }
}
