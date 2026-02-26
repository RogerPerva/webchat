# Guía de integración — Widget de Chat

Este documento explica cómo llevar el widget a cualquier sitio web, ya sea embebiendo un script en un sitio existente (WordPress, HTML estático, etc.) o copiando el código fuente en un proyecto React.

---

## Opción A — Embeber como script (WordPress, HTML, etc.) — Recomendada

La forma más sencilla de agregar el chat a cualquier sitio web. No necesitas tocar el código fuente del sitio destino, solo agregar 3 líneas.

### 1. Generar el build del widget

```bash
npm install
npm run build:widget
```

Esto genera en `dist-widget/`:
```
dist-widget/
├── iwa-chat-widget.js    ← script del widget
└── iwa-chat-widget.css   ← estilos del widget
```

### 2. Subir los archivos

Sube `iwa-chat-widget.js` e `iwa-chat-widget.css` a tu servidor, CDN (Cloudflare, S3, GitHub Pages, etc.) o directamente a la carpeta de medios de WordPress.

### 3. Agregar el snippet en tu sitio

Pega esto antes del cierre de `</body>`. En WordPress puedes hacerlo desde:
- **Apariencia > Editor de temas > footer.php** (tema hijo recomendado)
- Un plugin como **Insert Headers and Footers**, **WPCode** o similar
- El bloque de **HTML personalizado** en el editor de bloques (Gutenberg)

```html
<!-- IWA Chat Widget -->
<link rel="stylesheet" href="https://tu-dominio.com/ruta/iwa-chat-widget.css" />
<script>
  window.IWAChatConfig = {
    webhookUrl: 'https://tu-instancia.n8n.cloud/webhook/tu-ruta',
    recaptchaSiteKey: 'tu-site-key-de-recaptcha'  // opcional, omitir si no usas reCAPTCHA
  };
</script>
<script src="https://tu-dominio.com/ruta/iwa-chat-widget.js"></script>
```

### Configuración de `window.IWAChatConfig`

| Propiedad | Requerida | Descripción |
|---|---|---|
| `webhookUrl` | Sí | URL del webhook de n8n que procesa los mensajes del chat |
| `recaptchaSiteKey` | No | Clave pública de Google reCAPTCHA v3. Si se omite, el chat funciona sin protección anti-spam |

### Ejemplo completo en WordPress (WPCode)

Si usas el plugin WPCode:
1. Ve a **WPCode > Agregar fragmento > HTML personalizado**
2. Pega el snippet de arriba
3. En ubicación selecciona **Site Wide Footer**
4. Actívalo y guarda

### Notas importantes

- Los nombres de archivo son **fijos** (`iwa-chat-widget.js` y `iwa-chat-widget.css`), no cambian entre builds. Esto facilita actualizaciones sin tocar el snippet.
- El widget crea su propio contenedor (`#iwa-chat-widget`) y no depende de ningún `<div>` existente en tu sitio.
- Los estilos están aislados: no modifican el `body`, tipografía ni layout de tu sitio.
- El botón flotante aparece automáticamente en la esquina inferior derecha.

---

## Opción B — Integración en proyecto React existente

Si tu sitio destino ya usa React, puedes copiar los componentes directamente.

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
VITE_RECAPTCHA_SITE_KEY=tu-site-key-aqui
```

En producción, configura estas variables en tu plataforma de despliegue (Vercel, Netlify, etc.).

### 4. Personalizar `chat.config.ts`

Este es el **único archivo que cambia** de un cliente a otro:

```ts
// URL del webhook de n8n
export const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL as string

// Mensaje inicial que se envía al abrir una nueva consulta
export const INITIAL_USER_MESSAGE = 'Hola, quisiera agendar una consulta.'

// Fragmento que n8n manda en su respuesta para mostrar el calendario
export const CALENDAR_TRIGGER = 'podría seleccionar una fecha y hora'

// Fragmento que n8n manda cuando el folio no existe
export const INVALID_FOLIO_TRIGGER = 'folio incorrecto'

// Opciones del menú de consulta existente
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
| `podría seleccionar una fecha y hora` | Muestra el selector de fecha y hora |
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

Todos los colores se controlan desde las variables CSS:

| Variable | Uso | Default |
|---|---|---|
| `--color-primary` | Botón flotante, burbujas del usuario, botones de acción | `#f54b15` |
| `--color-dark` | Fondo general | `#121212` |
| `--color-dark-light` | Fondo del panel del chat | `#1a1a2e` |
| `--color-gray-light` | Texto de mensajes del bot | `#d0d0d0` |

El color del header del chat se define directamente en `ChatWidget.tsx` (`bg-[#a03308]`).

Para la **Opción A (script embed)**, los colores se configuran en `src/widget.css` y se aplican al rebuild con `npm run build:widget`.

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (app completa con HeroSection) |
| `npm run build` | Build de producción de la app completa |
| `npm run build:widget` | Build del widget embebible (solo el chat flotante) |
| `npm run preview` | Vista previa del build de producción |

---

## Checklist de integración (Opción A — Script embed)

- [ ] `npm run build:widget` ejecutado sin errores
- [ ] Archivos `iwa-chat-widget.js` e `iwa-chat-widget.css` subidos al servidor/CDN
- [ ] Snippet agregado en el footer del sitio destino con `webhookUrl` configurado
- [ ] CORS configurado en n8n si el dominio es diferente
- [ ] Flujo probado: botón flotante visible en esquina inferior derecha
- [ ] Flujo probado: nueva consulta → formulario → folio recibido
- [ ] Flujo probado: consulta existente → folio válido → tema → respuesta
- [ ] Flujo probado: folio inválido → mensaje de error → reinicio

## Checklist de integración (Opción B — React)

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
