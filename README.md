# WebChat - IWA Consolti

Widget de chat con IA para sitio web, conectado a n8n como backend conversacional.

## Funcionalidades

- **Chat en tiempo real** con IA a través de webhook de n8n
- **Formulario de contacto** integrado que recopila nombre, teléfono, correo, tipo de aplicación, presupuesto y descripción
- **Botón flotante (FAB)** en esquina inferior derecha para abrir/cerrar el chat
- **Hero section** réplica del sitio de IWA Consolti (navbar + banner)
- **Accesibilidad**: cierre con ESC, click fuera, focus automático, aria-labels
- **Responsive**: se adapta a móvil y desktop

## Stack

React + TypeScript + Vite + Tailwind CSS v4

## Requisitos

- Node.js >= 18

## Instalación y ejecución

```bash
npm install
npm run dev
```

Abre http://localhost:5173 en tu navegador.

## Build de producción

```bash
npm run build
npm run preview
```

## Configuración

Copia `.env.example` a `.env` y configura la URL del webhook:

```bash
cp .env.example .env
```

## Estructura

```
src/
├── components/
│   ├── HeroSection.tsx         Navbar + hero banner
│   ├── FloatingChatButton.tsx  FAB que abre/cierra el widget
│   ├── ChatWidget.tsx          Widget de chat completo
│   └── ScheduleForm.tsx        Formulario de datos del cliente
├── services/
│   └── chatApi.ts              Conexión con webhook de n8n
├── App.tsx
├── main.tsx
└── index.css
```

## Integración en otros sitios

Ver [INTEGRATION.md](./INTEGRATION.md) para instrucciones de cómo integrar solo el chat en cualquier página web.
