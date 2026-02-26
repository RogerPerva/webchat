import { useEffect, useRef } from 'react'
import { useChatSession } from '../hooks/useChatSession'
import ScheduleForm from './ScheduleForm'
import DateTimePicker from './DateTimePicker'

interface ChatWidgetProps {
  isOpen: boolean
  onClose: () => void
  executeRecaptcha?: ((action?: string) => Promise<string>) | undefined
}

export default function ChatWidget({ isOpen, onClose, executeRecaptcha }: ChatWidgetProps) {
  const session = useChatSession({ executeRecaptcha })

  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Foco en el input al abrir (solo cuando ya se eligió modo)
  useEffect(() => {
    if (isOpen && session.chatMode !== null) {
      inputRef.current?.focus()
    }
  }, [isOpen, session.chatMode])

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session.messages])

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Cerrar al hacer clic fuera del panel
  useEffect(() => {
    if (!isOpen) return
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', onClick), 100)
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', onClick) }
  }, [isOpen, onClose])

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Chat de asistencia"
      className="animate-slide-up fixed right-4 bottom-24 z-50 flex w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-dark-light shadow-2xl sm:right-6 sm:w-[440px]"
      style={{ height: 'min(572px, calc(100vh - 8rem))' }}
    >
      {/* ── Header ── */}
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
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── Área de mensajes ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4" role="log" aria-live="polite">

        {/* Selección de modo */}
        {session.chatMode === null && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm font-medium text-white/80">¿En qué podemos ayudarte?</p>
            <div className="flex w-full flex-col gap-2">
              <button onClick={session.handleNewConsultation} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85">
                Nueva consulta
              </button>
              <button onClick={session.handleExistingConsultation} className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10">
                Consulta existente
              </button>
            </div>
          </div>
        )}

        {/* Paso 1 – Ingreso de folio */}
        {session.showFolioInput && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <p className="text-center text-sm font-medium text-white/80">Ingresa tu número de folio:</p>
            <div className="w-full space-y-1.5">
              <div className="flex w-full gap-2">
                <input
                  type="text"
                  value={session.folioInput}
                  onChange={(e) => { session.setFolioInput(e.target.value); session.clearFolioError() }}
                  onKeyDown={(e) => e.key === 'Enter' && session.handleFolioSubmit()}
                  placeholder="Ej. 123456789"
                  maxLength={9}
                  autoFocus
                  className={`flex-1 rounded-full border bg-white/5 px-4 py-2 text-sm text-white placeholder-white/40 outline-none transition-colors focus:border-primary ${session.folioError ? 'border-red-400/70' : 'border-white/10'}`}
                />
                <button
                  onClick={session.handleFolioSubmit}
                  disabled={!session.folioInput.trim() || session.isLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                >
                  <SendIcon />
                </button>
              </div>
              {session.folioError && <p className="pl-4 text-xs text-red-400">{session.folioError}</p>}
            </div>
          </div>
        )}

        {/* Paso 2 – Selección de tema */}
        {session.showTopicSelection && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm font-medium text-white/80">¿Qué necesitas?</p>
            <div className="flex w-full flex-col gap-2">
              {session.existingTopics.map((topic) => (
                <button
                  key={topic.label}
                  onClick={() => session.handleTopicSelect(topic.message)}
                  disabled={session.isLoading}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 disabled:opacity-40"
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mensajes del chat */}
        {session.messages.map((msg) => (
          <div key={msg.id} className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2 text-sm leading-relaxed ${
              msg.sender === 'user'
                ? 'rounded-br-sm bg-primary text-white'
                : 'rounded-bl-sm bg-white/10 text-gray-light'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* Botón de reinicio (folio inválido) */}
        {session.showRestart && (
          <div className="mb-3 flex justify-center">
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10"
            >
              Reiniciar chat
            </button>
          </div>
        )}

        {/* Indicador de carga */}
        {session.isLoading && (
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

        {/* Selector de fecha */}
        {session.showCalendar && (
          <div className="mb-3 flex justify-start">
            <div className="w-[95%] rounded-2xl rounded-bl-sm bg-white/10">
              <DateTimePicker onConfirm={session.handleDateTimeConfirm} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Formulario de cita ── */}
      {session.showSchedule && (
        <div className="max-h-72 overflow-y-auto border-t border-white/10">
          <ScheduleForm
            onSubmit={session.handleScheduleSubmit}
            onCancel={() => session.setShowSchedule(false)}
          />
        </div>
      )}

      {/* ── Área de input ── */}
      <div className="border-t border-white/10 px-4 py-3">
        {session.showRestart ? (
          <p className="text-center text-xs text-white/30">Reinicia el chat para continuar.</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={session.input}
                onChange={(e) => session.setInput(e.target.value)}
                onKeyDown={session.handleKeyDown}
                disabled={session.inputDisabled}
                placeholder={session.inputPlaceholder}
                aria-label="Mensaje de chat"
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/40 outline-none transition-colors focus:border-primary disabled:opacity-40"
              />
              <button
                onClick={session.handleSend}
                disabled={!session.input.trim() || session.isLoading || session.inputDisabled}
                aria-label="Enviar mensaje"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                <SendIcon />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-white/30">El contenido generado por la IA puede ser inexacto.</p>
            <p className="mt-1 text-center text-[10px] text-white/30">
              Protegido por reCAPTCHA —{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline hover:text-white/50">Privacidad</a>
              {' '}·{' '}
              <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="underline hover:text-white/50">Términos</a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Icono reutilizable ────────────────────────────────────────────────────────

function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}
