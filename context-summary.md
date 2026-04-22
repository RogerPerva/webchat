# Context Summary — Remediación Seguridad IWA ChatBot

**Última actualización:** 2026-04-22 (tarde — Bloque 1 rama `resume` casi completa en n8n)
**Proyecto:** webchat (widget React) + workflow n8n en `iwaconsolti.app.n8n.cloud/webhook/iwa-ai`
**Documento base:** `security-assessment.md`

## 1. Resumen de lo implementado

- Análisis del `security-assessment.md` y plan de remediación en 6 bloques.
- **Bloque 4 (reCAPTCHA v3 en cada petición) completado** — frontend + n8n. Bots sin token o con token inválido son bloqueados antes del LLM.
- **Bloque 1 (IDOR) — en progreso.** Frontend 100% listo. n8n: ramas `new` y `resume` funcionales; falta cerrar rama `FALSE` de `Existe el chat` y construir ramas `otp_verify` y `continue`.
- Bloque 3 (Rate Limiting nativo con staticData) descartado por race conditions. Reemplazado por rate limit específico de envío de OTP (dentro de Bloque 1) y por reCAPTCHA como barrera principal.

## 2. Estado actual del sistema

| Bloque | Estado | Notas |
|---|---|---|
| 1. sessionToken firmado (IDOR) | 🚧 En progreso | Pivoteado a **folio + OTP por correo**. Frontend completo. n8n rama `resume` casi terminada. |
| 2. HMAC auth del webhook | ⬜ Pendiente | Problema del secreto en JS público sigue abierto. Reducido en prioridad: OTP por correo cubre parcialmente el vector. |
| 3. Rate limiting global | ⚠️ Pausado | Nodo existe pero no efectivo por race conditions. Reemplazado por rate limit específico (OTP send) que SÍ funciona porque el estado vive en Sheets. |
| 4. reCAPTCHA server-side en cada petición | ✅ Completado | Frontend firma cada `doSend`; n8n valida contra `siteverify` y bloquea antes del LLM. |
| 5. Filtro contenido sobrecalibrado | ⬜ Pendiente | Bloquea confirmaciones legítimas ("solo humanos"). |
| 6. PII / GDPR | ⬜ Pendiente | Memoria indexada por chatId sin cifrado ni TTL. Bloque 1 reduce el vector pero no lo elimina. |

## 3. Decisiones tomadas

### Decisiones previas (Bloques 3, 4)
- **Rate limit nativo con staticData descartado:** n8n persiste al final de la ejecución con merge last-write-wins → imposible atomicidad.
- **No usar Upstash/Redis:** mantener todo dentro de n8n sin infra externa.
- **CF bloquea curl con User-Agent por defecto:** tests deben usar UA de Chrome + origin + referer.

### Decisiones de Bloque 1 (sessionToken → folio + OTP)
- **Pivot del plan original:** descartamos UUID + HMAC token porque el usuario no tiene acceso a Variables en n8n Cloud (plan de paga más bajo). Alternativa elegida: **folio de 10 dígitos + OTP de 6 caracteres por correo**.
- **Formato OTP:** 3 letras (A-Z sin I/O) + 3 números (2-9 sin 0/1). Formato display: `XXX-XXX`. Generado con `crypto.getRandomValues` en n8n.
- **Hash del OTP:** SHA-256 en Google Sheets. Nunca guardar OTP en claro.
- **TTL del OTP:** 10 minutos.
- **TTL de sesión verificada:** 45 minutos (`session_verified_at` en Sheets).
- **Rate limit de envío OTP:** 3 por folio por hora. Bloqueo silencioso (mismo mensaje genérico, no revela bloqueo).
- **Rate limit de validación OTP:** máximo 3 intentos fallidos por folio → bloquea hasta próximo reenvío.
- **Seguridad vs UX — folio inválido:** se eligió Opción A (máxima seguridad) — responder siempre con el mismo mensaje genérico, no revelar si el folio existe.
- **Compatibilidad folios viejos (9 dígitos):** migración silenciosa (Opción A). No requiere cutover.
- **Campo JSON:** mantener `nueva_consulta` en el body pero con valores string (`new` / `resume` / `otp_verify` / `continue`) en lugar de boolean. Evita renombrar todo en n8n.
- **Cooldown reenviar código (frontend):** 60 segundos. Solo UX; la barrera real es el rate limit de 3/hora en n8n.
- **Columna email:** existe en Sheet `prospectos` como `correo`. Nodo "Buscar chat para correo" hace lookup por `chat_id`.

## 4. Bloque 1 — Detalle de implementación

### Frontend (✅ completo)

Cambios aplicados en estos archivos:

- **`src/chat.config.ts`**: añadidas `FOLIO_LENGTH`, `OTP_LENGTH`, `OTP_RESEND_COOLDOWN_MS`, `OTP_SENT_MESSAGE`, `OTP_ERROR_MESSAGE`, `SESSION_EXPIRED_MESSAGE`.
- **`src/services/chatApi.ts`**: `generateFolio()` reemplaza a `generateChatId()`, nuevo type `ChatIntent`, funciones `requestOtp()` y `verifyOtp()`, payload ahora incluye `folio`, `nueva_consulta` (string), `otp` (opcional).
- **`src/hooks/useChatSession.ts`**: estados `awaitingOtp`, `otpInput`, `otpError`, `otpResendSeconds`. Handlers `handleOtpSubmit`, `handleResendOtp`, `requestOtpForFolio`. Transición automática `new` → `continue` tras primer reply del bot.
- **`src/components/ChatWidget.tsx`**: nueva UI de input OTP (formato `XXX-XXX`), botón "Reenviar código" con cooldown visual, label actualizado a "Ingresa el código enviado a tu correo".

### n8n — estado por rama

**Switch1 con 4 outputs:**
- Output 0 (`continue`) — ⬜ pendiente. Debe validar `session_verified_at < 45min` → LLM. Hoy está mal cableado al flujo de resume (ISSUE A CORREGIR).
- Output 1 (`resume`) — 🚧 casi completo. Ver detalle abajo.
- Output 2 (`otp_verify`) — ⬜ pendiente. Nodos de código ya existen pero desconectados y con referencias incorrectas (ej. `$('Buscar chat').first()` cuando el nodo real se llama distinto).
- Output 3 (`new`) — ✅ funcional (usa flujo `Primeros pasos` que ya existía).

**Rama `resume` (casi completa):**
```
Switch1 (resume)
  → Buscar info OTP del chat (Sheets lookup por chat_id)
  → If1 (¿chat_id no vacío?)
      TRUE:
        → Rate limit OTP send (Code)
        → ¿Demasiadas request? (IF sobre _rate_limited)
            TRUE:  → [pendiente: Respond 200 genérico]
            FALSE: → Generar OTP (Code)
                   → Guardar OTP en Sheet (Google Sheets Update)
                   → Buscar chat para correo (Sheets lookup en prospectos)
                   → Enviar OTP a usuario (Gmail)
                   → [pendiente: Respond 200 genérico]
      FALSE:
        → [pendiente: Respond 200 genérico idéntico al TRUE, por seguridad]
```

## 5. Próximos pasos

### Bloque 1 — tareas pendientes inmediatas

Orden sugerido:

1. **Cerrar rama `resume` en n8n:**
   - Añadir Respond to Webhook 200 después de `Enviar OTP a usuario` con body `{"message":"Hemos enviado un código a tu correo registrado con el folio que ingresaste. Ingrésalo para continuar."}`.
   - Conectar rama FALSE de `Existe el chat` al **mismo** Respond 200 (no revelar que el folio no existe).
   - Conectar rama TRUE de `¿Demasiadas request?` al **mismo** Respond 200 (no revelar rate limit).

2. **Construir rama `otp_verify`:**
   - Código de validación ya existe (`Verificar OTP correcto` Code node) pero las referencias internas están rotas — hay que reapuntarlas al nombre correcto del nodo de búsqueda.
   - Añadir Google Sheets Update para persistir `otp_attempts`, `session_verified_at`, limpiar `otp_hash` si verificó.
   - Respond to Webhook 200 con body `{"verified": true/false}`.

3. **Construir rama `continue`:**
   - Nodo Code que lea `session_verified_at` del chat y calcule si `(now - verifiedAt) < 45min`.
   - Si válido → conectar al flujo LLM existente.
   - Si expiró → Respond 200 con `{"session_expired": true, "message":"Tu sesión expiró por seguridad..."}` para que el frontend vuelva a pedir OTP.

4. **Corregir cableado Switch1:**
   - Output 0 (continue) debe ir a la rama de validación de sesión, no al flujo actual que tiene (conectado incorrectamente).
   - Output 3 (new) debe conectar a `Primeros pasos`.

5. **Pruebas end-to-end** (por hacer después de que n8n esté completo):
   - Folio inexistente → mensaje genérico idéntico al caso exitoso, NO llega correo.
   - Folio existente → llega correo con OTP; Sheet se actualiza con hash/expires/last_sent.
   - OTP correcto → `verified: true`, Sheet marca `session_verified_at`, limpia `otp_hash`.
   - OTP incorrecto 3x → bloqueado. 4to intento con OTP correcto → también rechaza.
   - Mensaje con `intent=continue` tras OTP válido → pasa al LLM.
   - Mensaje con `intent=continue` sin OTP previo o con sesión > 45min → rechazo.
   - Rate limit envío OTP: pedir OTP 4x → 4to bloquea silenciosamente.

### Bloques posteriores

**Bloque 2 — HMAC auth:** reducido en prioridad. Evaluar si seguir necesario después de Bloque 1. OTP por correo cubre el vector principal.

**Bloque 4 — pendientes opcionales:**
- Cambiar mensaje de bloqueo actual (`"Lo siento, solo humanos."`) por un 403 con payload estructurado — colisiona con mensaje del filtro de contenido.
- Log de bloqueos para monitoreo de score distribution.

**Bloque 5 — filtro contenido sobrecalibrado:**
- Clasificador de intención de 2 pasos.
- Permitir confirmaciones cortas ("sí", "ok", "confirmo").

**Bloque 6 — PII/GDPR:**
- Cifrado en reposo de nombres, teléfonos, correos.
- TTL de 90 días por sesión con purga automática.
- Endpoint "derecho al olvido".
- Aviso de privacidad antes de capturar datos.

## 6. Riesgos y pendientes críticos

- **IDOR sigue activo hasta cerrar Bloque 1 completo.** Las 3 ramas de n8n (`resume`, `otp_verify`, `continue`) deben estar funcionando juntas para que el flujo completo proteja contra IDOR.
- **Switch1 mal cableado:** output `continue` apunta al flujo de búsqueda de chat que era del viejo `resume`. Corregir antes de probar E2E.
- **Nodos Code con referencias rotas:** `$('Buscar chat').first().json` en el código de validación — el nodo real se llama diferente. Revisar y ajustar.
- **Rate limiting global pausado.** Mitigaciones activas: reCAPTCHA + rate limit específico OTP. Suficiente para bots y enumeración, no para ataques volumétricos puros.
- **HMAC secret en frontend:** problema abierto. Sin Variables en n8n Cloud (plan bajo), única alternativa es hardcodear en nodo o leer de Sheets.

## 7. Contexto técnico clave

- **Stack:** React + TypeScript + Vite (widget), n8n Cloud (backend workflow).
- **Webhook:** `POST https://iwaconsolti.app.n8n.cloud/webhook/iwa-ai`
- **Google Sheets documento:** `1LyO03jsfP5KpTMNqQ4R-l09MP1bmD8NXRHQHnCAX_VE` ("Whatsapp-iwa-n8n").
  - Sheet `prospectos` (gid 1430389999): datos de leads. Columna email = `correo`.
  - Sheet `chats` (gid 1342198822): estado de sesión. Columnas nuevas para OTP: `otp_hash`, `otp_expires_at`, `otp_attempts`, `otp_sent_count_hour`, `last_otp_sent_at`, `session_verified_at`.
- **Frontend archivos relevantes:**
  - `src/services/chatApi.ts` — cliente HTTP, `generateFolio()`, `sendMessage`, `requestOtp`, `verifyOtp`.
  - `src/hooks/useChatSession.ts` — lógica de sesión, recaptcha, OTP, inactividad.
  - `src/components/ChatWidget.tsx` — UI (incluye input OTP).
  - `src/chat.config.ts` — constantes (FOLIO_LENGTH, OTP_LENGTH, mensajes, cooldowns).
- **Intents del payload** (`body.nueva_consulta`):
  - `new` — primer mensaje. Crea prospecto y chat.
  - `resume` — usuario ingresa folio. n8n genera OTP y envía correo.
  - `otp_verify` — usuario ingresa OTP. n8n valida y marca sesión.
  - `continue` — mensaje normal con sesión verificada. n8n valida TTL y pasa al LLM.
- **Headers confiables en n8n:** `cf-connecting-ip` > `x-real-ip`.
- **Webhook n8n mode:** `Using 'Respond to Webhook' Node`.
- **Archivo de referencia del workflow n8n:** `flujo de n8n.json` en la raíz del repo (snapshot del workflow para contexto, no se edita directo).
