# Guía de integración — Widget de Chat

Este documento explica cómo llevar el widget a cualquier sitio web, ya sea copiando el código fuente en un proyecto React existente o desplegándolo como un script independiente.

---

## Opción A — Integración en proyecto React existente (recomendada)

La arquitectura del widget está diseñada para ser portable. Solo necesitas copiar 7 archivos y configurar una variable de entorno.

### 1. Copiar los archivos

Copia la siguiente estructura a tu proyecto:

```
src/
├── chat.config.ts                  ← único archivo que debes editar por cliente
├── services/
│   └── chatApi.ts
├── hooks/
│   └── useChatSession.ts
└── components/
    ├── FloatingChatButton.tsx
    ├── ChatWidget.tsx
    ├── ScheduleForm.tsx
    └── DateTimePicker.tsx
```

### 2. Agregar dependencias de CSS

El widget usa Tailwind CSS v4. Si tu proyecto ya lo tiene, no necesitas hacer nada más.
Si no, instálalo:

```bash
npm install -D tailwindcss @tailwindcss/vite
```

En `vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

Agrega en tu CSS global (ej. `index.css`) los colores y la animación que usa el widget:

```css
@import "tailwindcss";

@theme {
  --color-primary: #f54b15;       /* botón flotante y burbujas del usuario */
  --color-dark: #121212;
  --color-dark-light: #1a1a2e;    /* fondo del panel del chat */
  --color-gray-light: #d0d0d0;    /* texto de mensajes del bot */
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(16px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
.animate-slide-up { animation: slide-up 0.2s ease-out; }
```

### 3. Crear el `.env`

```env
VITE_N8N_WEBHOOK_URL=https://tu-instancia.n8n.cloud/webhook/tu-ruta
```

En producción, configura esta variable en tu plataforma de despliegue (Vercel, Netlify, etc.).

### 4. Personalizar `chat.config.ts`

Este es el **único archivo que cambia** de un cliente a otro:

```ts
// URL del webhook de n8n
export const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL as string

// Mensaje inicial que se envía al abrir una nueva consulta
export const INITIAL_USER_MESSAGE = 'Hola, quisiera agendar una consulta.'

// Fragmento que n8n manda en su respuesta para mostrar el calendario
export const CALENDAR_TRIGGER = 'podria seleccionar una fecha y hora que le quede bien para la reunion'

// Fragmento que n8n manda cuando el folio no existe
export const INVALID_FOLIO_TRIGGER = 'folio incorrecto'

// Opciones del menú de consulta existente (agrega o quita según el cliente)
export const EXISTING_TOPICS = [
  { label: 'Quiero reagendar',              message: 'Hola, me gustaría reagendar mi cita.' },
  { label: 'Quiero cambiar mi información', message: 'Hola, necesito actualizar mi información.' },
  { label: 'Reenvíame la invitación',       message: 'Hola, ¿podrían reenviar la invitación?' },
]

// Tipos de proyecto en el formulario de nueva consulta
export const APP_TYPE_OPTIONS = [
  { value: '',               label: 'Selecciona tipo de aplicación *' },
  { value: 'Web App',        label: 'Web App' },
  { value: 'Landing Page',   label: 'Landing Page' },
  { value: 'Móvil App',      label: 'Móvil App' },
  { value: 'Automatización', label: 'Automatización' },
  { value: 'Otra',           label: 'Otra' },
]
```

### 5. Montar el widget

```tsx
// En cualquier componente raíz de tu app
import FloatingChatButton from './components/FloatingChatButton'

export default function App() {
  return (
    <>
      {/* tu contenido */}
      <FloatingChatButton />
    </>
  )
}
```

---

## Opción B — Embeber como script (sin modificar el proyecto destino)

Útil cuando el sitio destino no es React o no tienes acceso al código fuente.

### 1. Preparar el build solo con el chat

Modifica `src/App.tsx` para que solo exporte el widget:

```tsx
import FloatingChatButton from './components/FloatingChatButton'

export default function App() {
  return <FloatingChatButton />
}
```

### 2. Generar el build

```bash
npm install
npm run build
```

Esto genera en `dist/assets/`:
```
dist/assets/
├── index-XXXX.js
└── index-XXXX.css
```

### 3. Subir a CDN o servidor

Sube el contenido de `dist/assets/` a tu hosting, CDN (Cloudflare, S3, etc.) o GitHub Pages.

### 4. Agregar en el HTML destino

Pega esto antes del cierre de `</body>` en cualquier página:

```html
<!-- CSS del widget -->
<link rel="stylesheet" href="https://tu-dominio.com/assets/index-XXXX.css" />

<!-- Contenedor donde React montará el widget -->
<div id="root"></div>

<!-- JS del widget -->
<script type="module" src="https://tu-dominio.com/assets/index-XXXX.js"></script>
```

El widget se renderiza de forma independiente y no interfiere con el CSS ni JS del sitio destino.

---

## Opción C — iframe

La opción más rápida si no quieres tocar nada del sitio destino. Despliega el proyecto completo y embébelo:

```html
<iframe
  src="https://tu-dominio.com"
  style="position:fixed;bottom:0;right:0;width:420px;height:600px;border:none;z-index:9999;"
  allow="clipboard-write"
></iframe>
```

> **Limitación:** Con iframe se pierden comportamientos nativos como cerrar con Escape o hacer clic fuera del panel.

---

## Flujo del chat

```
Usuario abre el chat
  │
  ├── Nueva consulta
  │     └── Se envía mensaje inicial automáticamente
  │           └── Bot responde → aparece formulario de datos
  │                 └── Usuario llena formulario y envía
  │                       └── Bot confirma → aparece mensaje con folio
  │
  └── Consulta existente
        └── Usuario ingresa folio (9 dígitos exactos)
              ├── Folio inválido (formato) → error local, no se envía nada
              ├── Folio no encontrado → n8n responde con error → input se congela → botón "Reiniciar chat"
              └── Folio válido → aparecen temas a elegir
                    └── Usuario selecciona tema → se envía mensaje predefinido → chat libre
```

---

## Payload que se envía a n8n

```json
{
  "message": {
    "from": { "id": 387429841, "first_name": "Roger" },
    "chat": { "id": 387429841, "first_name": "Roger", "type": "private" },
    "text": "Mensaje del usuario"
  },
  "nueva_consulta": true
}
```

| Campo | Descripción |
|---|---|
| `message.chat.id` | ID de sesión. En nuevas consultas: número aleatorio de 9 dígitos generado al cargar la página (este mismo número es el folio que se le muestra al usuario al final). En consultas existentes: el folio ingresado por el usuario. |
| `message.from.first_name` | Nombre del usuario, tomado del formulario. Antes de llenarlo aparece como `"Visitante"`. |
| `nueva_consulta` | `true` para nueva consulta, `false` para existente. |

---

## Respuestas esperadas de n8n

n8n debe responder **dentro del mismo ciclo HTTP** (antes del timeout del `fetch`). El widget acepta estos formatos:

```json
{ "message": "Texto de respuesta" }
{ "output":  "Texto de respuesta" }
{ "text":    "Texto de respuesta" }
```

### Respuestas con efecto especial

| Fragmento en la respuesta | Efecto |
|---|---|
| `podria seleccionar una fecha y hora que le quede bien para la reunion` | Muestra el selector de fecha y hora |
| `folio incorrecto` | Congela el input y muestra el botón "Reiniciar chat" |

Los fragmentos son **case-insensitive** y configurables en `chat.config.ts` (`CALENDAR_TRIGGER`, `INVALID_FOLIO_TRIGGER`).

---

## CORS

Si el widget se sirve desde un dominio diferente al de n8n, configura los headers en el nodo **"Respond to Webhook"** de tu flujo:

```
Access-Control-Allow-Origin: https://tu-dominio.com
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Content-Type
```

---

## Personalización de colores

Todos los colores se controlan desde las variables CSS en `index.css`:

| Variable | Uso | Default |
|---|---|---|
| `--color-primary` | Botón flotante, burbujas del usuario, botones de acción | `#f54b15` |
| `--color-dark` | Fondo general | `#121212` |
| `--color-dark-light` | Fondo del panel del chat | `#1a1a2e` |
| `--color-gray-light` | Texto de mensajes del bot | `#d0d0d0` |

El color del header del chat se define directamente en `ChatWidget.tsx` (`bg-[#a03308]`).

---

## Checklist de integración

- [ ] Archivos copiados con la estructura correcta
- [ ] Tailwind CSS v4 configurado en `vite.config.ts`
- [ ] Variables de color y animación en el CSS global
- [ ] `.env` creado con `VITE_N8N_WEBHOOK_URL`
- [ ] `chat.config.ts` editado: webhook, textos, topics y opciones del formulario
- [ ] `<FloatingChatButton />` montado en el componente raíz
- [ ] CORS configurado en n8n si el dominio es diferente
- [ ] Flujo probado: nueva consulta → formulario → folio recibido
- [ ] Flujo probado: consulta existente → folio válido → tema → respuesta
- [ ] Flujo probado: folio inválido → mensaje de error → reinicio
