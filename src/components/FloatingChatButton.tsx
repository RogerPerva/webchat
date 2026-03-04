import { useState, useCallback } from 'react'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import ChatWidget from './ChatWidget'

type ExecuteRecaptcha = ((action?: string) => Promise<string>) | undefined

interface FloatingChatButtonInnerProps {
  executeRecaptcha: ExecuteRecaptcha
}

function FloatingChatButtonInner({ executeRecaptcha }: FloatingChatButtonInnerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  const handleToggle = useCallback(async () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }

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
  }, [isOpen, executeRecaptcha])

  return (
    <div data-iwa-root>
      <button
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
        onClick={handleToggle}
        disabled={isVerifying}
        className="fixed bottom-6 right-6 z-50 flex h-[54px] w-[54px] items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-70 disabled:cursor-wait"
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
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

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
