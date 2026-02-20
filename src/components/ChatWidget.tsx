import { useEffect, useRef, useState, useCallback } from 'react'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import type { ChatMessage, AppointmentData } from '../services/chatApi'
import { sendMessage, setUserName, buildAppointmentText } from '../services/chatApi'
import ScheduleForm from './ScheduleForm'

interface ChatWidgetProps {
  onClose: () => void
}

const INITIAL_USER_MESSAGE = 'Hola, quisiera agendar una consulta.'

function createMessage(text: string, sender: 'user' | 'bot'): ChatMessage {
  return { id: crypto.randomUUID(), text, sender, timestamp: new Date() }
}

export default function ChatWidget({ onClose }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState(INITIAL_USER_MESSAGE)
  const [isLoading, setIsLoading] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [hasReceivedFirstReply, setHasReceivedFirstReply] = useState(false)
  const { executeRecaptcha } = useGoogleReCaptcha()

  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

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
      const token = isFirstMessage ? await getRecaptchaToken() : undefined
      const reply = await sendMessage(text, token)
      appendMessage(createMessage(reply, 'bot'))

      if (!hasReceivedFirstReply) {
        setHasReceivedFirstReply(true)
        setShowSchedule(true)
      }
    } catch {
      appendMessage(createMessage('Lo siento, hubo un error al conectar. Intenta de nuevo.', 'bot'))
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text || isLoading) return
    doSend(text, messages.length === 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleScheduleSubmit = async (data: AppointmentData) => {
    setShowSchedule(false)
    setUserName(data.name.trim().split(/\s+/)[0])
    await doSend(buildAppointmentText(data), false)
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Chat de asistencia"
      className="animate-slide-up fixed right-4 bottom-24 z-50 flex w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-dark-light shadow-2xl sm:right-6 sm:w-[440px]"
      style={{ height: 'min(572px, calc(100vh - 8rem))' }}
    >
      <div className="flex items-center justify-between bg-[#a03308] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Asistente</h2>
            <p className="text-xs text-white/70">En línea</p>
          </div>
        </div>
        <button
          aria-label="Cerrar chat"
          onClick={onClose}
          className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'rounded-br-sm bg-primary text-white'
                  : 'rounded-bl-sm bg-white/10 text-gray-light'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="mb-3 flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2 text-sm text-gray-light">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce [animation-delay:0.15s]">.</span>
                <span className="animate-bounce [animation-delay:0.3s]">.</span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {showSchedule && (
        <div className="max-h-72 overflow-y-auto border-t border-white/10">
          <ScheduleForm
            onSubmit={handleScheduleSubmit}
            onCancel={() => setShowSchedule(false)}
          />
        </div>
      )}

      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={showSchedule}
            placeholder={showSchedule ? 'Completa el formulario arriba' : 'Escribe un mensaje...'}
            aria-label="Mensaje de chat"
            className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/40 outline-none transition-colors focus:border-primary disabled:opacity-40"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || showSchedule}
            aria-label="Enviar mensaje"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-white/30">El contenido generado por la IA puede ser inexacto.</p>
      </div>
    </div>
  )
}
