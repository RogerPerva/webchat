# Context Summary — Remediación Seguridad IWA ChatBot

**Última actualización:** 2026-04-22 (noche — Bloque 1 casi completo, solo falta rama `continue`)
**Proyecto:** webchat (widget React) + workflow n8n en `iwaconsolti.app.n8n.cloud/webhook/iwa-ai`
**Documento base:** `security-assessment.md`

## 1. Resumen de lo implementado

- Análisis del `security-assessment.md` y plan de remediación en 6 bloques.
- **Bloque 4 (reCAPTCHA v3 en cada petición) completado** — frontend + n8n. Bots sin token o con token inválido son bloqueados antes del LLM.
- **Bloque 1 (IDOR) — 80% completo.** Frontend 100% listo. n8n: ramas `new`, `resume` y `otp_verify` completamente funcionales. Manejo de RATE_LIMITED con bloqueo persistente client-side. Solo falta cablear rama `continue` (Switch1 output 0) y arreglar bug del doble incremento del contador (ya identificado, fix en `Generar OTP`).
- Bloque 3 (Rate Limiting nativo con staticData) descartado por race conditions. Reemplazado por rate limit específico de envío de OTP (3/hora/folio en Sheets) y por reCAPTCHA como barrera principal.

## 2. Estado actual del sistema

| Bloque | Estado | Notas |
|---|---|---|
| 1. sessionToken firmado (IDOR) | 🚧 80% | Pivoteado a **folio + OTP por correo**. Frontend completo. n8n: ramas `new`, `resume`, `otp_verify` funcionales; falta `continue`. |
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
- **Formato OTP:** 3 letras (A-Z sin I/O) + 3 números (2-9 sin 0/1). Formato display: `XXX-XXX`. Generado con `Math.random()` + shuffle en n8n (no crypto-grade pero suficiente con TTL 10min).
- **OTP guardado en plano (no SHA-256):** decisión pragmática — la columna se llama `otp_hash` por convención pero contiene el OTP plano. La comparación en n8n es directa string-to-string. Acceptable porque la Sheet no es accesible públicamente y el TTL es corto.
- **TTL del OTP:** 10 minutos.
- **TTL de sesión verificada:** 45 minutos (`session_verified_at` en Sheets).
- **Rate limit de envío OTP:** 3 por folio por hora. Tras superarlo: bloqueo client-side persistido en localStorage (TTL 1h, key `iwa_otp_blocked_<folio>`) + mensaje rojo "Máximo de intentos alcanzado, contáctanos por correo".
- **Rate limit de validación OTP:** máximo 3 intentos fallidos por folio → `OTP correcto?` evalúa FALSE por la condición `otp_attempts < 3`. Para reintentar: el usuario debe pedir un nuevo OTP (que cae bajo el rate limit de envío → encadena al bloqueo total).
- **Seguridad vs UX — folio inválido:** se eligió Opción A (máxima seguridad) — responder siempre con el mismo mensaje genérico, no revelar si el folio existe. **Confirmado tras pivot:** se intentó usar un Set node `INVALID` con `errorType: "invalid"`, se descartó porque rompía la Opción A (frontend ignora el campo, pero un atacante con curl podía distinguir).
- **Seguridad vs UX — rate limited:** trade-off aceptado, sí revela que el folio existe (vía `errorType: "RATE_LIMITED"`). Justificación: folios de 10 dígitos + reCAPTCHA hacen que la enumeración sea costosa, y el beneficio UX (parar al usuario que sigue pidiendo códigos) supera el leak menor.
- **Compatibilidad folios viejos (9 dígitos):** migración silenciosa (Opción A). No requiere cutover.
- **Campo JSON:** mantener `nueva_consulta` en el body pero con valores string (`new` / `resume` / `otp_verify` / `continue`) en lugar de boolean. Evita renombrar todo en n8n.
- **Cooldown reenviar código (frontend):** 60 segundos. Solo UX; la barrera real es el rate limit de 3/hora en n8n.
- **Columna email:** existe en Sheet `prospectos` como `correo`. Nodo "Buscar chat para correo" hace lookup por `chat_id`.
- **OTP enviado al backend con guion:** el frontend formatea `2S2-S33` antes de enviar (no `2S2S33`) porque `Generar OTP` lo guarda con guion. La comparación en `OTP correcto?` es exact-match.
- **Mensaje OTP enviado renderizado como header**, no como burbuja de chat. Evita contaminar `messages.length` (que es señal para mostrar `showTopicSelection` después de verificar).

## 4. Bloque 1 — Detalle de implementación

### Frontend (✅ completo)

Cambios aplicados en estos archivos:

- **`src/chat.config.ts`**: añadidas `FOLIO_LENGTH`, `OTP_LENGTH`, `OTP_RESEND_COOLDOWN_MS`, `OTP_SENT_MESSAGE`, `OTP_ERROR_MESSAGE`, `SESSION_EXPIRED_MESSAGE`, **`OTP_RATE_LIMITED_MESSAGE`**, **`OTP_RATE_LIMIT_TTL_MS`**.
- **`src/services/chatApi.ts`**: `generateFolio()`, type `ChatIntent`, **`requestOtp()` retorna `RequestOtpResult { reply, errorType? }`** para detectar `RATE_LIMITED`. `verifyOtp()` envía OTP con guion. Payload incluye `folio`, `nueva_consulta` (string), `otp` (opcional).
- **`src/hooks/useChatSession.ts`**:
  - Estados: `awaitingOtp`, `otpInput`, `otpError`, `otpResendSeconds`, **`rateLimitedAt`** (timestamp de expiración del bloqueo).
  - Helpers de localStorage: `readRateLimit(folio)`, `writeRateLimit(folio, expiresAt)` con prefix `iwa_otp_blocked_`.
  - `requestOtpForFolio` setea `awaitingOtp(true)` **inmediatamente** (no después del await) para evitar que `showTopicSelection` aparezca brevemente.
  - Si la respuesta tiene `errorType === 'RATE_LIMITED'` → llama `applyRateLimit(folio)` que escribe localStorage + setea `rateLimitedAt`.
  - `handleFolioSubmit` chequea `readRateLimit(folio)` ANTES de hacer la llamada — si está bloqueado, ni siquiera consulta al servidor.
  - `handleResendOtp` y `handleOtpSubmit` cortan early si `rateLimitedAt !== null`.
  - `handleOtpSubmit` formatea OTP con guion antes de enviar: `${otp.slice(0,3)}-${otp.slice(3)}`.
  - `useEffect` auto-limpia `rateLimitedAt` cuando expira el TTL.
  - `resetSession` limpia el estado pero NO el localStorage (el bloqueo persiste por folio aunque reinicien — comportamiento deseado).
- **`src/components/ChatWidget.tsx`**:
  - Bloque OTP renderiza `OTP_SENT_MESSAGE` como header pequeño (`text-xs leading-relaxed text-white/70`), no como mensaje de chat.
  - Cuando `otpRateLimited === true`: oculta input + resend, muestra mensaje rojo + botón "Reiniciar chat".
  - Indicador global de loading (`isLoading`) gateado a `messages.length > 0` para no mostrar dots durante folio/OTP/temas.
  - Import de `OTP_SENT_MESSAGE` desde `chat.config`.

### n8n — estado por rama

**Switch1 con 4 outputs:**
- Output 0 (`continue`) — ⬜ **PENDIENTE.** Debe validar `session_verified_at < 45min` → LLM. Hoy probablemente sigue mal cableado al flujo viejo de resume. Ver "Próximos pasos".
- Output 1 (`resume`) — ✅ **completo y probado.**
- Output 2 (`otp_verify`) — ✅ **completo y probado.**
- Output 3 (`new`) — ✅ funcional (usa flujo `Primeros pasos` que ya existía).

**Rama `resume` (✅ completa):**
```
Switch1 (resume)
  → Buscar info OTP del chat (Sheets lookup por chat_id)
  → Existe el chat (IF: chat_id no vacío)
      TRUE:
        → Rate limit (Code) — calcula reset si >1h, devuelve _rate_limited y _new_otp_count
        → Demasiadas request? (IF sobre _rate_limited)
            TRUE (no rate limited): → Generar OTP
                                     → Guardar OTP (Sheets appendOrUpdate)
                                     → Buscar chat para correo (lookup en prospectos)
                                     → Enviar OTP a usuario (Gmail)
                                     → Correo enviado a usuario (Respond 200, errorType vacío)
            FALSE (rate limited): → RATE_LIMITED (Set node, errorType="RATE_LIMITED")
                                  → Correo enviado a usuario (mismo Respond, ahora con errorType)
      FALSE: → Correo enviado a usuario (mensaje genérico, sin errorType)
```

Respuesta unificada (`Correo enviado a usuario`):
```json
{
  "chat_id": <id>,
  "message": "Hemos enviado un código a tu correo registrado con el folio que ingresaste. Ingrésalo para continuar.",
  "errorType": "{{ $json.errorType }}"
}
```
HTTP 200 siempre. `errorType` es `""` para happy path y `"RATE_LIMITED"` cuando aplica.

**Rama `otp_verify` (✅ completa):**
```
Switch1 (otp_verify)
  → Buscar chat para OTP (Sheets lookup por chat_id)
  → OTP correcto? (IF con 3 condiciones AND: hash equals + expiry > now + attempts < 3)
      TRUE:
        → Marcar sesion verificada (Sheets Update: limpia otp_hash, attempts=0, session_verified_at=now)
        → OTP valido (Respond 200: {chat_id, verified: true})
      FALSE:
        → Incrementar intentos OTP (Sheets Update: otp_attempts +1)
        → OTP invalido (Respond 200: {chat_id, verified: false})
```

### Bug conocido (corregido manualmente por el usuario el 2026-04-22)

**`Generar OTP` tenía doble incremento del contador:** el Code node terminaba con `_new_otp_count: Number(item.json._new_otp_count ?? 0) + 1` que sumaba 1 al valor que ya venía calculado de `Rate limit`. Resultado: el conteo en Sheets crecía de 2 en 2, bloqueando al usuario al 3er intento en vez del 4to. **Fix aplicado:** se eliminó esa línea del return; el `_new_otp_count` ahora se pasa intacto vía `...item.json`.

## 5. Próximos pasos

### Bloque 1 — tareas pendientes inmediatas

1. **Construir rama `continue` (Switch1 output 0):**
   - Nodo Code o Sheets Lookup que lea `session_verified_at` del chat row.
   - Calcular si `(now - verifiedAt) < 45min`.
   - Si válido → conectar al flujo LLM existente (donde estaba antes el viejo flujo de chat).
   - Si expiró → Respond 200 con `{session_expired: true, message: SESSION_EXPIRED_MESSAGE}` para que el frontend vuelva a pedir OTP.
   - Considerar también el caso `session_verified_at` vacío/null (usuario que nunca verificó pero manda `continue`) → tratar igual que expirado.

2. **Manejar `session_expired` en el frontend:**
   - `chatApi.ts` → `sendMessage` actualmente extrae solo `reply`. Debe parsear y devolver también `sessionExpired: boolean` (ya está el campo en `SendMessageResult` pero no se usa).
   - `useChatSession.ts` → si `sessionExpired`, volver a setear `awaitingOtp(true)` y disparar OTP nuevo automáticamente, mostrando `SESSION_EXPIRED_MESSAGE`.

3. **Pruebas end-to-end completas:**
   - ✅ Folio inexistente → mensaje genérico idéntico al caso exitoso, NO llega correo.
   - ✅ Folio existente → llega correo con OTP; Sheet se actualiza.
   - ✅ OTP correcto → `verified: true`, Sheet marca `session_verified_at`, limpia `otp_hash`.
   - ✅ OTP incorrecto 3x → bloqueado.
   - ✅ Rate limit envío OTP: 4to bloquea con `RATE_LIMITED` + bloqueo persistente.
   - ⬜ Mensaje con `intent=continue` tras OTP válido → debe pasar al LLM.
   - ⬜ Mensaje con `intent=continue` sin OTP previo o con sesión > 45min → debe rechazar y pedir OTP nuevo.

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

- **IDOR cerrado en 80%:** las ramas `resume`, `otp_verify` están cubiertas. Falta `continue` para que un atacante no pueda mandar `intent=continue` con un chat_id ajeno y entrar al LLM como esa sesión.
- **Switch1 output 0 (continue) sigue mal cableado** o vacío. Es la última pieza para cerrar IDOR.
- **Rate limiting global pausado.** Mitigaciones activas: reCAPTCHA + rate limit específico OTP. Suficiente para bots y enumeración, no para ataques volumétricos puros.
- **HMAC secret en frontend:** problema abierto. Sin Variables en n8n Cloud (plan bajo), única alternativa es hardcodear en nodo o leer de Sheets.
- **`errorType: "RATE_LIMITED"` filtra que el folio existe.** Trade-off aceptado conscientemente. Si en el futuro se añade un Bloque 7 de hardening, considerar si vale la pena revertir.

## 7. Contexto técnico clave

- **Stack:** React + TypeScript + Vite (widget), n8n Cloud (backend workflow).
- **Webhook:** `POST https://iwaconsolti.app.n8n.cloud/webhook/iwa-ai`
- **Google Sheets documento:** `1LyO03jsfP5KpTMNqQ4R-l09MP1bmD8NXRHQHnCAX_VE` ("Whatsapp-iwa-n8n").
  - Sheet `prospectos` (gid 1430389999): datos de leads. Columna email = `correo`.
  - Sheet `chats` (gid 1342198822): estado de sesión. Columnas OTP: `otp_hash` (plano, no SHA), `otp_expires_at`, `otp_attempts`, `otp_sent_count_hour`, `last_otp_sent_at`, `session_verified_at`.
- **Frontend archivos relevantes:**
  - `src/services/chatApi.ts` — cliente HTTP, `generateFolio()`, `sendMessage`, `requestOtp` (retorna `RequestOtpResult`), `verifyOtp`.
  - `src/hooks/useChatSession.ts` — lógica de sesión, recaptcha, OTP, inactividad, bloqueo rate-limit con localStorage.
  - `src/components/ChatWidget.tsx` — UI (incluye input OTP, mensaje de bloqueo rojo).
  - `src/chat.config.ts` — constantes (FOLIO_LENGTH, OTP_LENGTH, mensajes, cooldowns, OTP_RATE_LIMIT_TTL_MS).
- **Intents del payload** (`body.nueva_consulta`):
  - `new` — primer mensaje. Crea prospecto y chat.
  - `resume` — usuario ingresa folio. n8n genera OTP y envía correo.
  - `otp_verify` — usuario ingresa OTP. n8n valida y marca sesión.
  - `continue` — mensaje normal con sesión verificada. n8n debe validar TTL y pasar al LLM. **(rama no construida aún)**.
- **Headers confiables en n8n:** `cf-connecting-ip` > `x-real-ip`.
- **Webhook n8n mode:** `Using 'Respond to Webhook' Node`.
- **Archivo de referencia del workflow n8n:** `flujo.json` en la raíz del repo (snapshot del workflow para contexto, no se edita directo — se importa/exporta desde el editor de n8n).
- **Patrón de unificación de respuestas en n8n:** se usan Set nodes (ej `RATE_LIMITED`) para inyectar campos como `errorType` antes de un Respond compartido. Mantiene un solo punto de respuesta y permite que el frontend distinga casos vía el campo.
- **Reset del rate limit es lazy/on-demand:** ningún cron limpia Sheets. El Code node `Rate limit` lee `last_otp_sent_at` y si `> 1h` trata `currentCount = 0` aunque el valor en Sheets sea distinto. Se sobreescribe en el siguiente `Guardar OTP`.

## 8. Preguntas esclarecedoras para futura sesión

- **¿La rama `continue` debe usar el mismo flujo LLM que la rama `new`, o hay que crear uno separado?** Si es el mismo, hay que asegurarse que el contexto del chat (memoria del LLM) se mantenga coherente entre `new` y `continue`. Si es separado, hay duplicación.
- **¿Qué pasa si un usuario verifica OTP y nunca manda mensaje en 45min?** Su `session_verified_at` expira y al mandar `continue` falla. ¿Volvemos a pedir OTP automáticamente en frontend o le pedimos folio+OTP completo?
- **¿El bloqueo client-side por `RATE_LIMITED` debe limpiarse al hacer "Reiniciar chat"?** Actualmente NO se limpia (es deliberado: el folio sigue bloqueado server-side, no tiene sentido ocultar el bloqueo en frontend). Confirmar que el comportamiento es el deseado por el negocio.
- **`otp_hash` en Sheets contiene OTP plano, no hash.** ¿En algún momento se quiere migrar a SHA-256 real? Pros: defensa en profundidad si alguien lee la Sheet. Contras: migración no trivial, romperá OTPs en vuelo, requiere cambiar la comparación en `OTP correcto?`.
- **Generación de OTP usa `Math.random()`, no CSPRNG.** Aceptable para el threat model actual (TTL 10min, rate limit 3/hora) pero anotar como deuda técnica si se eleva el nivel de criticidad.
- **¿El campo `session_verified_at` debe extenderse cada mensaje exitoso (sliding window)?** El plan dice TTL fijo de 45min desde verificación. Si la conversación dura 50min con actividad continua, el usuario es expulsado mid-conversación. Decisión pendiente.
- **El `RATE_LIMIT_TTL_MS` del frontend (1h) y la ventana del backend (1h en `Rate limit` Code node) deben permanecer sincronizados.** Si se cambia uno, cambiar el otro. Considerar moverlo a una constante compartida (vía config remoto o hardcoded en ambos lados con comentario cruzado).
- **¿Se hizo prueba con folios viejos de 9 dígitos?** El plan menciona "migración silenciosa" pero no se confirmó que funcione. Validar antes de cerrar Bloque 1.
