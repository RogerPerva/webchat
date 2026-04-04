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
