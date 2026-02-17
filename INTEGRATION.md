# Integrar el chat en cualquier sitio web

## Opción 1: Embeber como script (recomendado)

Genera el build de producción y sirve los archivos estáticos desde tu hosting.

### 1. Build

```bash
npm install
npm run build
```

Esto genera la carpeta `dist/` con los archivos listos:

```
dist/
├── index.html
└── assets/
    ├── index-XXXX.js
    └── index-XXXX.css
```

### 2. Subir archivos

Sube el contenido de `dist/assets/` a tu servidor o CDN.

### 3. Agregar en tu HTML

En cualquier página donde quieras el chat, agrega antes del cierre de `</body>`:

```html
<!-- CSS del widget -->
<link rel="stylesheet" href="https://tu-dominio.com/assets/index-XXXX.css" />

<!-- Contenedor del widget -->
<div id="root"></div>

<!-- JS del widget -->
<script type="module" src="https://tu-dominio.com/assets/index-XXXX.js"></script>
```

El widget (FAB + chat) se renderiza de forma independiente. No interfiere con el CSS ni JS de tu sitio.

### 4. Solo el chat (sin el hero)

Si solo necesitas el chat sin la sección hero, modifica `src/App.tsx` antes del build:

```tsx
import FloatingChatButton from './components/FloatingChatButton'

function App() {
  return <FloatingChatButton />
}

export default App
```

Esto genera un build que solo incluye el botón flotante y el widget de chat.

## Opción 2: iframe

Si no quieres modificar nada, despliega el proyecto completo y embébelo como iframe:

```html
<iframe
  src="https://tu-dominio.com/chat"
  style="position:fixed;bottom:0;right:0;width:420px;height:600px;border:none;z-index:9999;"
  allow="clipboard-write"
></iframe>
```

**Nota:** Con iframe pierdes la integración nativa (ESC para cerrar, click fuera, etc.).

## Opción 3: Web Component (avanzado)

Puedes envolver el widget en un Web Component para encapsularlo completamente. Crea `src/web-component.tsx`:

```tsx
import { createRoot } from 'react-dom/client'
import FloatingChatButton from './components/FloatingChatButton'

class ChatWidget extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' })
    const container = document.createElement('div')
    shadow.appendChild(container)
    createRoot(container).render(<FloatingChatButton />)
  }
}

customElements.define('iwa-chat', ChatWidget)
```

Luego úsalo en cualquier HTML:

```html
<script type="module" src="https://tu-dominio.com/assets/web-component.js"></script>
<iwa-chat></iwa-chat>
```

## Configuración del webhook

El webhook de n8n se configura en `src/services/chatApi.ts` o a través de variables de entorno:

```bash
# .env
VITE_N8N_WEBHOOK_URL=https://tu-instancia-n8n.com/webhook/iwa-ai
```

Si no se define la variable, usa la URL por defecto configurada en el código.

## CORS

Si el widget se sirve desde un dominio diferente al de n8n, configura los headers CORS en tu workflow de n8n (nodo "Respond to Webhook"):

```
Access-Control-Allow-Origin: https://tu-dominio.com
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Content-Type
```
