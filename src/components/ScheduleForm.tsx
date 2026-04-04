import { useState } from 'react'
import type { AppointmentData } from '../services/chatApi'
import { APP_TYPE_OPTIONS } from '../chat.config'

interface ScheduleFormProps {
  onSubmit: (data: AppointmentData) => void
}

type ValidatedField = 'name' | 'phone' | 'email' | 'appType' | 'description' | 'canInvest'
type FormErrors = Partial<Record<ValidatedField, string>>

const MAX_DESCRIPTION = 500

function formatBudget(raw: string, currency: string): string {
  if (!raw) return ''
  const num = parseFloat(raw)
  if (isNaN(num)) return ''
  const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `$${formatted} ${currency}`
}

export default function ScheduleForm({ onSubmit }: ScheduleFormProps) {
  const [phonePrefix, setPhonePrefix] = useState('+52')
  const [budgetRaw, setBudgetRaw] = useState('')
  const [budgetCurrency, setBudgetCurrency] = useState<'USD' | 'MXN'>('MXN')
  const [form, setForm] = useState<AppointmentData>({
    name: '',
    phone: '',
    email: '',
    company: '',
    appType: '',
    budget: '',
    description: 'Me gustaria orientacion para aterrizar una idea...',
    canInvest: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = 'El nombre es requerido'

    if (!form.phone.trim()) e.phone = 'El teléfono es requerido'
    else if (!/^\d{10}$/.test(form.phone)) e.phone = 'El teléfono debe tener exactamente 10 dígitos'

    if (!form.email.trim()) e.email = 'El correo es requerido'
    else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email)) e.email = 'Ingresa un correo válido'

    if (!form.appType) e.appType = 'Selecciona una opción'
    if (!form.description.trim()) e.description = 'La descripción es requerida'
    else if (form.description.length > MAX_DESCRIPTION) e.description = `Máximo ${MAX_DESCRIPTION} caracteres`
    if (!form.canInvest) e.canInvest = 'Selecciona una opción'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (validate()) {
      const formatted = formatBudget(budgetRaw, budgetCurrency)
      onSubmit({ ...form, phone: `${phonePrefix} ${form.phone}`, budget: formatted })
    }
  }

  const updateField = (field: keyof AppointmentData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field as ValidatedField]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const baseFieldClass = 'w-full rounded-lg border bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none transition-colors focus:border-primary'
  const fieldClass = (field: ValidatedField) => `${baseFieldClass} ${errors[field] ? 'border-red-500' : 'border-white/10'}`

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-4 py-4">
      <h3 className="text-sm font-semibold text-white">Completa tus datos</h3>

      <div>
        <input
          type="text"
          placeholder="Nombre completo *"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          aria-label="Nombre completo"
          aria-invalid={!!errors.name}
          maxLength={100}
          className={fieldClass('name')}
        />
        {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
      </div>

      <div>
        <div className="flex gap-2">
          <select
            value={phonePrefix}
            onChange={(e) => setPhonePrefix(e.target.value)}
            aria-label="Prefijo telefónico"
            className={`w-28 shrink-0 appearance-none rounded-lg border px-2 py-2 text-center text-sm text-white outline-none transition-colors focus:border-primary ${errors.phone ? 'border-red-500 bg-white/5' : 'border-white/10 bg-white/5'}`}
          >
            <option value="+52" className="bg-dark text-white">🇲🇽 +52</option>
            <option value="+1" className="bg-dark text-white">🇺🇸 +1</option>
            <option value="+34" className="bg-dark text-white">🇪🇸 +34</option>
            <option value="+54" className="bg-dark text-white">🇦🇷 +54</option>
            <option value="+55" className="bg-dark text-white">🇧🇷 +55</option>
            <option value="+56" className="bg-dark text-white">🇨🇱 +56</option>
            <option value="+57" className="bg-dark text-white">🇨🇴 +57</option>
            <option value="+51" className="bg-dark text-white">🇵🇪 +51</option>
            <option value="+58" className="bg-dark text-white">🇻🇪 +58</option>
            <option value="+593" className="bg-dark text-white">🇪🇨 +593</option>
            <option value="+591" className="bg-dark text-white">🇧🇴 +591</option>
            <option value="+595" className="bg-dark text-white">🇵🇾 +595</option>
            <option value="+598" className="bg-dark text-white">🇺🇾 +598</option>
            <option value="+506" className="bg-dark text-white">🇨🇷 +506</option>
            <option value="+507" className="bg-dark text-white">🇵🇦 +507</option>
            <option value="+502" className="bg-dark text-white">🇬🇹 +502</option>
            <option value="+503" className="bg-dark text-white">🇸🇻 +503</option>
            <option value="+504" className="bg-dark text-white">🇭🇳 +504</option>
            <option value="+505" className="bg-dark text-white">🇳🇮 +505</option>
            <option value="+509" className="bg-dark text-white">🇭🇹 +509</option>
            <option value="+53" className="bg-dark text-white">🇨🇺 +53</option>
            <option value="+1809" className="bg-dark text-white">🇩🇴 +1809</option>
            <option value="+501" className="bg-dark text-white">🇧🇿 +501</option>
            <option value="+592" className="bg-dark text-white">🇬🇾 +592</option>
            <option value="+597" className="bg-dark text-white">🇸🇷 +597</option>
            <option value="+594" className="bg-dark text-white">🇬🇫 +594</option>
            <option value="+1868" className="bg-dark text-white">🇹🇹 +1868</option>
            <option value="+1876" className="bg-dark text-white">🇯🇲 +1876</option>
          </select>
          <input
            type="tel"
            placeholder="Teléfono (10 dígitos) *"
            value={form.phone}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '')
              if (value.length <= 10) updateField('phone', value)
            }}
            aria-label="Teléfono de contacto"
            aria-invalid={!!errors.phone}
            maxLength={10}
            className={`min-w-0 flex-1 rounded-lg border bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none transition-colors focus:border-primary ${errors.phone ? 'border-red-500' : 'border-white/10'}`}
          />
        </div>
        {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
      </div>

      <div>
        <input
          type="email"
          placeholder="Correo electrónico *"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          aria-label="Correo electrónico"
          aria-invalid={!!errors.email}
          maxLength={254}
          className={fieldClass('email')}
        />
        {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
      </div>

      <div>
        <input
          type="text"
          placeholder="Empresa (opcional)"
          value={form.company}
          onChange={(e) => updateField('company', e.target.value)}
          aria-label="Empresa"
          maxLength={100}
          className={`${baseFieldClass} border-white/10`}
        />
      </div>

      <div>
        <select
          value={form.appType}
          onChange={(e) => updateField('appType', e.target.value)}
          aria-label="Cómo te identificarías"
          aria-invalid={!!errors.appType}
          className={`appearance-none ${fieldClass('appType')} ${form.appType ? '' : 'text-white/40!'}`}
        >
          {APP_TYPE_OPTIONS.map((opt, idx) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={idx === 0}
              className="bg-dark text-white"
            >
              {opt.label}
            </option>
          ))}
        </select>
        {errors.appType && <p className="mt-1 text-xs text-red-400">{errors.appType}</p>}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          placeholder="Presupuesto (opcional)"
          value={budgetRaw}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9.]/g, '')
            if ((v.match(/\./g) || []).length <= 1) {
              const num = parseFloat(v)
              if (v === '' || v === '.' || (!isNaN(num) && num <= 999999999)) setBudgetRaw(v)
            }
          }}
          aria-label="Presupuesto"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none transition-colors focus:border-primary"
        />
        <select
          value={budgetCurrency}
          onChange={(e) => setBudgetCurrency(e.target.value as 'USD' | 'MXN')}
          aria-label="Moneda"
          className="w-20 shrink-0 appearance-none rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-center text-sm text-white outline-none transition-colors focus:border-primary"
        >
          <option value="MXN" className="bg-dark text-white">MXN</option>
          <option value="USD" className="bg-dark text-white">USD</option>
        </select>
      </div>

      <div>
        <textarea
          placeholder="Descripción del problema *"
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          aria-label="Descripción del problema"
          aria-invalid={!!errors.description}
          rows={3}
          maxLength={MAX_DESCRIPTION}
          className={`resize-none ${fieldClass('description')}`}
        />
        {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description}</p>}
      </div>

      <div>
        <p className="mb-2 text-xs text-white/70">
          Los proyectos de software pueden comenzar a partir de 6,000 USD a 20,000 USD en el mercado. ¿Cuentas con la posibilidad de invertir el total o en cuotas? *
        </p>
        <select
          value={form.canInvest}
          onChange={(e) => updateField('canInvest', e.target.value)}
          aria-label="Posibilidad de inversión"
          aria-invalid={!!errors.canInvest}
          className={`appearance-none ${fieldClass('canInvest')} ${form.canInvest ? '' : 'text-white/40!'}`}
        >
          <option value="" disabled className="bg-dark text-white">Selecciona una opción *</option>
          <option value="si" className="bg-dark text-white">Sí, podría invertir esos valores</option>
          <option value="no" className="bg-dark text-white">No puedo invertir en mi proyecto en este momento</option>
        </select>
        {errors.canInvest && <p className="mt-1 text-xs text-red-400">{errors.canInvest}</p>}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
        >
          Enviar
        </button>
      </div>
    </form>
  )
}
