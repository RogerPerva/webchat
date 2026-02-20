import { useState, useCallback } from 'react'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import ChatWidget from './ChatWidget'

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const { executeRecaptcha } = useGoogleReCaptcha()

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
      if (import.meta.env.DEV) {
        setIsOpen(true)
      }
    } finally {
      setIsVerifying(false)
    }
  }, [isOpen, executeRecaptcha])

  return (
    <>
      <button
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
        onClick={handleToggle}
        disabled={isVerifying}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-70 disabled:cursor-wait"
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

      {isOpen && <ChatWidget onClose={() => setIsOpen(false)} />}
    </>
  )
}
