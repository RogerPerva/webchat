// ─────────────────────────────────────────────────────────────────────────────
// chat.config.ts — Fuente única de verdad para personalizar el widget de chat.
// Edita este archivo para adaptar el widget a cualquier proyecto.
// ─────────────────────────────────────────────────────────────────────────────

/** URL del webhook de n8n que procesa los mensajes */
export const WEBHOOK_URL =
  window.IWAChatConfig?.webhookUrl ?? (import.meta.env.VITE_N8N_WEBHOOK_URL as string)

// ── Mensajes del sistema ──────────────────────────────────────────────────────

/** Mensaje que se envía automáticamente al iniciar una nueva consulta */
export const INITIAL_USER_MESSAGE = 'Hola, quisiera agendar una consulta.'

/** Fragmento que n8n incluye en su respuesta cuando quiere mostrar el calendario */
export const CALENDAR_TRIGGER = 'podría seleccionar una fecha y hora'

/** Fragmento que n8n incluye cuando el folio ingresado no existe */
export const INVALID_FOLIO_TRIGGER = 'folio incorrecto'

/** Fragmento que activa el countdown de cierre de sesión */
export const FAREWELL_TRIGGER = 'folio para que podamos ayudarte'

/** Duración del countdown de cierre de sesión en segundos */
export const FAREWELL_COUNTDOWN_SECONDS = 2 * 60 // 2 minutos

/** Tiempo de inactividad antes de cerrar la sesión (milisegundos) */
export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutos

// ── Folio y OTP ───────────────────────────────────────────────────────────────

/** Longitud del folio de sesión (10 dígitos numéricos) */
export const FOLIO_LENGTH = 10

/** Longitud del código OTP (3 letras + 3 números, formato XXX-XXX al mostrar) */
export const OTP_LENGTH = 6

/** Cooldown entre reenvíos de OTP (ms) */
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000 // 1 minuto

/** Mensaje genérico al enviar OTP (no revelar si el folio existe o no) */
export const OTP_SENT_MESSAGE =
  'Hemos enviado un código a tu correo registrado con el folio que ingresaste. Ingrésalo para continuar.'

/** Mensaje genérico de error en validación OTP */
export const OTP_ERROR_MESSAGE = 'No pudimos verificar tu información. Revisa el código e intenta de nuevo.'

/** Mensaje cuando la sesión verificada expira mid-conversación */
export const SESSION_EXPIRED_MESSAGE =
  'Tu sesión expiró por seguridad. Ingresa de nuevo el código que te enviamos por correo.'

// ── Temas para consultas existentes ──────────────────────────────────────────
// Agrega, quita o edita entradas según los casos de uso del negocio.


export const EXISTING_TOPICS: { label: string; message: string }[] = [
  {
    label: 'Quiero reagendar',
    message: 'Hola, me gustaría reagendar mi cita. ¿Podrían ayudarme con eso?',
  },
  {
    label: 'Quiero cambiar mi información',
    message: 'Hola, necesito actualizar mi información de contacto registrada.',
  },
  {
    label: 'Reenvíame la invitación',
    message: 'Hola, ¿podrían reenviar la confirmación/invitación a mi correo?',
  },
]

// ── Opciones del formulario de nueva consulta ─────────────────────────────────

export const APP_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '¿Cómo te identificarías? *' },
  { value: 'Quiero aterrizar una idea', label: 'Quiero aterrizar una idea' },
  { value: 'Ya tengo los requerimientos', label: 'Ya tengo los requerimientos' },
]
