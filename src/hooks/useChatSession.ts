import { useState, useRef, useCallback } from 'react'
import {
  sendMessage,
  buildAppointmentText,
  CHAT_ID,
  type ChatMessage,
  type ChatContext,
  type AppointmentData,
} from '../services/chatApi'
import {
  INITIAL_USER_MESSAGE,
  CALENDAR_TRIGGER,
  INVALID_FOLIO_TRIGGER,
  EXISTING_TOPICS,
} from '../chat.config'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ChatMode = null | 'new' | 'existing'

export interface UseChatSessionOptions {
  executeRecaptcha?: ((action?: string) => Promise<string>) | null
}

export interface ChatSession {
  // Estado
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

  // Derivados
  showFolioInput: boolean
  showTopicSelection: boolean
  inputDisabled: boolean
  inputPlaceholder: string

  // Handlers
  setInput: (v: string) => void
  setFolioInput: (v: string) => void
  clearFolioError: () => void
  setShowSchedule: (v: boolean) => void
  handleNewConsultation: () => void
  handleExistingConsultation: () => void
  handleFolioSubmit: () => void
  handleTopicSelect: (message: string) => void
  handleSend: () => void
  handleKeyDown: (e: React.KeyboardEvent) => void
  handleDateTimeConfirm: (isoDate: string) => void
  handleScheduleSubmit: (data: AppointmentData) => void

  // Constante de configuración para el JSX
  existingTopics: typeof EXISTING_TOPICS

  // Mensaje de cierre con folio
  folioMessage: string
}

// ── Helper ────────────────────────────────────────────────────────────────────

function createMessage(text: string, sender: 'user' | 'bot'): ChatMessage {
  return { id: crypto.randomUUID(), text, sender, timestamp: new Date() }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useChatSession(options: UseChatSessionOptions = {}): ChatSession {
  const { executeRecaptcha } = options
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
  const [hasReceivedFirstReply, setHasReceivedFirstReply] = useState(false)

  // El contexto de sesión vive en una ref para no requerir re-renders
  // y para que doSend siempre lea el valor más reciente.
  const ctxRef = useRef<ChatContext>({
    chatId: CHAT_ID,
    isNewConsultation: true,
    userName: 'Visitante',
  })

  const appointmentJustSubmitted = useRef(false)

  const folioMessage = `Muchas gracias por haberte puesto en contacto con nosotros. En tu correo encontrarás tu folio, el cual puedes ingresar aquí por si tienes alguna duda o quieres reagendar. Te lo comparto de igual forma: ${CHAT_ID}`

  // ── Acción central de envío ───────────────────────────────────────────────

  const appendMessage = (msg: ChatMessage) =>
    setMessages((prev) => [...prev, msg])

  const getRecaptchaToken = useCallback(async (): Promise<string | undefined> => {
    if (!executeRecaptcha) return undefined
    try {
      return await executeRecaptcha('send_message')
    } catch {
      return undefined
    }
  }, [executeRecaptcha])

  const doSend = async (text: string, isFirstMessage = false) => {
    appendMessage(createMessage(text, 'user'))
    setInput('')
    setIsLoading(true)

    try {
      // Solo enviar token reCAPTCHA en el primer mensaje de nueva consulta
      const token = (isFirstMessage && ctxRef.current.isNewConsultation)
        ? await getRecaptchaToken()
        : undefined
      const reply = await sendMessage(text, ctxRef.current, token)
      appendMessage(createMessage(reply, 'bot'))

      if (reply.toLowerCase().includes(CALENDAR_TRIGGER)) {
        setShowCalendar(true)
      }

      if (reply.toLowerCase().includes(INVALID_FOLIO_TRIGGER)) {
        setShowRestart(true)
      }

      if (!hasReceivedFirstReply) {
        setHasReceivedFirstReply(true)
        if (ctxRef.current.isNewConsultation) {
          setShowSchedule(true)
        }
      }

      if (appointmentJustSubmitted.current) {
        appointmentJustSubmitted.current = false
        appendMessage(createMessage(folioMessage, 'bot'))
      }
    } catch {
      appendMessage(createMessage('Lo siento, hubo un error al conectar. Intenta de nuevo.', 'bot'))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleNewConsultation = () => {
    ctxRef.current = { ...ctxRef.current, isNewConsultation: true }
    setChatMode('new')
    doSend(INITIAL_USER_MESSAGE, true)
  }

  const handleExistingConsultation = () => {
    ctxRef.current = { ...ctxRef.current, isNewConsultation: false }
    setChatMode('existing')
  }

  const handleFolioSubmit = () => {
    const folio = folioInput.trim()
    if (!folio || isLoading) return
    if (!/^\d{9}$/.test(folio)) {
      setFolioError('El folio debe ser un número de 9 dígitos.')
      return
    }
    ctxRef.current = { ...ctxRef.current, chatId: parseInt(folio, 10) }
    setFolioInput('')
    setFolioError('')
    setFolioConfirmed(true)
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
    // Formatear fecha para mostrar de forma más estética
    const date = new Date(isoDate)
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
    const formattedDate = date.toLocaleDateString('es-MX', options)

    // Mensaje visual estético, pero el payload al backend usa ISO
    const userMessage = `Tengo disponibilidad para la fecha: ${formattedDate}`
    const payloadMessage = `Tengo disponibilidad para la fecha: ${isoDate}`

    // Mostrar mensaje estético al usuario
    appendMessage(createMessage(userMessage, 'user'))
    setInput('')
    setIsLoading(true)

    // Enviar con formato ISO al backend
    sendMessage(payloadMessage, ctxRef.current, undefined)
      .then((reply) => {
        appendMessage(createMessage(reply, 'bot'))

        // Verificar si el bot quiere mostrar el calendario de nuevo
        if (reply.toLowerCase().includes(CALENDAR_TRIGGER)) {
          setShowCalendar(true)
        }

        if (reply.toLowerCase().includes(INVALID_FOLIO_TRIGGER)) {
          setShowRestart(true)
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
    doSend(buildAppointmentText(data))
  }

  // ── Valores derivados ─────────────────────────────────────────────────────

  const showFolioInput = chatMode === 'existing' && !folioConfirmed
  const showTopicSelection = chatMode === 'existing' && folioConfirmed && messages.length === 0
  const inputDisabled = chatMode === null || showFolioInput || showTopicSelection || showSchedule || showCalendar

  const inputPlaceholder =
    chatMode === null        ? 'Selecciona una opción arriba...' :
    showFolioInput           ? 'Ingresa tu folio arriba...' :
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
    showFolioInput,
    showTopicSelection,
    inputDisabled,
    inputPlaceholder,
    folioMessage,
    existingTopics: EXISTING_TOPICS,
    setInput,
    setFolioInput,
    clearFolioError: () => setFolioError(''),
    setShowSchedule,
    handleNewConsultation,
    handleExistingConsultation,
    handleFolioSubmit,
    handleTopicSelect,
    handleSend,
    handleKeyDown,
    handleDateTimeConfirm,
    handleScheduleSubmit,
  }
}
