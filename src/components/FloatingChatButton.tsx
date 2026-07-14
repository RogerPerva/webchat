import { useState, useCallback, useEffect } from 'react'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import ChatWidget from './ChatWidget'

type ExecuteRecaptcha = ((action?: string) => Promise<string>) | undefined

interface FloatingChatButtonInnerProps {
  executeRecaptcha: ExecuteRecaptcha
}

// Se recuerda dentro de la pestaña para no volver a mostrar la tarjeta/burbuja
// tras haberlas cerrado o tras haber abierto el chat una vez.
const TEASER_DISMISSED_KEY = 'iwa-teaser-dismissed'

function readTeaserDismissed(): boolean {
  try {
    return sessionStorage.getItem(TEASER_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

function FloatingChatButtonInner({ executeRecaptcha }: FloatingChatButtonInnerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [showTeaser, setShowTeaser] = useState(() => !readTeaserDismissed())
  const [showGreeting, setShowGreeting] = useState(false)

  const dismissTeaser = useCallback(() => {
    setShowTeaser(false)
    setShowGreeting(false)
    try {
      sessionStorage.setItem(TEASER_DISMISSED_KEY, '1')
    } catch {
      /* sessionStorage no disponible (p. ej. modo privado) */
    }
  }, [])

  // Burbuja "Platiquemos": aparece una vez, poco después de cargar, y se
  // esconde sola si nadie interactuó con ella.
  useEffect(() => {
    if (!showTeaser) return
    const showTimer = setTimeout(() => setShowGreeting(true), 1000)
    const hideTimer = setTimeout(() => setShowGreeting(false), 5000)
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [showTeaser])

  const handleToggle = useCallback(async () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }

    dismissTeaser()

    if (!executeRecaptcha) {
      setIsOpen(true)
      return
    }

    setIsVerifying(true)
    try {
      await executeRecaptcha('open_chat')
      setIsOpen(true)
    } catch {
      setIsOpen(true)
    } finally {
      setIsVerifying(false)
    }
  }, [isOpen, executeRecaptcha, dismissTeaser])

  return (
    <div data-iwa-root className="fixed right-6 bottom-6 z-50 flex flex-col items-end">
      {showTeaser && !isOpen && (
        <div
          className="animate-teaser-in relative mb-4 w-[300px] max-w-[80vw] rounded-2xl bg-white p-5 text-[#222] after:absolute after:-bottom-2.5 after:right-8 after:h-5 after:w-5 after:rotate-45 after:bg-white after:content-['']"
          style={{ boxShadow: '0 25px 70px rgba(0,0,0,.22), 0 10px 25px rgba(0,0,0,.12)' }}
        >
          <button
            type="button"
            aria-label="Cerrar mensaje"
            onClick={dismissTeaser}
            className="absolute top-3 right-3.5 text-2xl leading-none text-[#999] transition-colors hover:text-[#555]"
          >
            &times;
          </button>
          <h3 className="mb-3 text-lg font-semibold">👋 ¿Necesitas ayuda?</h3>
          <p className="text-sm leading-relaxed text-[#555]">
            Agenda una consulta gratuita en menos de <strong>2 minutos</strong> y descubre cómo podemos desarrollar el software ideal para tu empresa.
          </p>
        </div>
      )}

      <div className="relative">
        {showGreeting && !isOpen && (
          <span
            className="animate-greeting pointer-events-none absolute top-1/2 right-[80px] whitespace-nowrap rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white after:absolute after:top-1/2 after:right-[-8px] after:h-3.5 after:w-3.5 after:rotate-45 after:bg-primary after:content-['']"
            style={{ boxShadow: '0 12px 28px rgba(245,75,21,.4)' }}
          >
            Platiquemos
          </span>
        )}

        <button
          aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
          onClick={handleToggle}
          disabled={isVerifying}
          className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full bg-primary text-white transition-transform hover:-translate-y-1 disabled:cursor-wait disabled:opacity-70"
          style={{ boxShadow: '0 15px 35px rgba(245,75,21,.45), 0 8px 18px rgba(0,0,0,.25)' }}
        >
          {isVerifying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <span className="relative block h-[34px] w-[34px]">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-icon-chat absolute inset-0 m-auto">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-icon-smile absolute inset-0 m-auto">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </span>
          )}

          {!isOpen && !isVerifying && (
            <span className="animate-notification-pulse absolute top-0.5 right-1.5 h-4 w-4 rounded-full border-[3px] border-white bg-[#ff3b30]" />
          )}
        </button>
      </div>

      <div className={isOpen ? '' : 'hidden'}>
        <ChatWidget isOpen={isOpen} onClose={() => setIsOpen(false)} executeRecaptcha={executeRecaptcha} />
      </div>
    </div>
  )
}

/** Wrapper that reads reCAPTCHA from provider context */
function WithRecaptcha() {
  const { executeRecaptcha } = useGoogleReCaptcha()
  return <FloatingChatButtonInner executeRecaptcha={executeRecaptcha} />
}

/** Main export — uses reCAPTCHA only when provider is present */
export default function FloatingChatButton({ hasRecaptchaProvider = true }: { hasRecaptchaProvider?: boolean }) {
  if (hasRecaptchaProvider) {
    return <WithRecaptcha />
  }
  return <FloatingChatButtonInner executeRecaptcha={undefined} />
}
