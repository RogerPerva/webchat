import { useState } from 'react'
import type { AppointmentData } from '../services/chatApi'
import { APP_TYPE_OPTIONS } from '../chat.config'

interface ScheduleFormProps {
  onSubmit: (data: AppointmentData) => void
}

type ValidatedField = 'name' | 'phone' | 'email' | 'appType' | 'description'
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
  const [budgetRaw, setBudgetRaw] = useState('')
  const [budgetCurrency, setBudgetCurrency] = useState<'USD' | 'MXN'>('MXN')
  const [form, setForm] = useState<AppointmentData>({
    name: '',
    phone: '',
    email: '',
    appType: '',
    budget: '',
    description: 'Me gustaria orientacion para aterrizar una idea...',
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = 'El nombre es requerido'

    if (!form.phone.trim()) e.phone = 'El teléfono es requerido'
    else if (!/^\d{10}$/.test(form.phone)) e.phone = 'El teléfono debe tener exactamente 10 dígitos'

    if (!form.email.trim()) e.email = 'El correo es requerido'
    else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email)) e.email = 'Ingresa un correo válido'

    if (!form.appType) e.appType = 'Selecciona un tipo de aplicación'
    if (!form.description.trim()) e.description = 'La descripción es requerida'
    else if (form.description.length > MAX_DESCRIPTION) e.description = `Máximo ${MAX_DESCRIPTION} caracteres`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (validate()) {
      const formatted = formatBudget(budgetRaw, budgetCurrency)
      onSubmit({ ...form, budget: formatted })
    }
  }

  const updateField = (field: keyof AppointmentData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field as ValidatedField]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const baseFieldClass = 'w-full rounded-lg border bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none transition-colors focus:border-primary'
  const fieldClass = (field: ValidatedField) =>
    `${baseFieldClass} ${errors[field] ? 'border-red-500' : 'border-white/10'}`
  const optionalFieldClass = `${baseFieldClass} border-white/10`

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
        <input
          type="tel"
          placeholder="Teléfono de contacto (10 dígitos) *"
          value={form.phone}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '')
            if (value.length <= 10) updateField('phone', value)
          }}
          aria-label="Teléfono de contacto"
          aria-invalid={!!errors.phone}
          maxLength={10}
          className={fieldClass('phone')}
        />
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
        <select
          value={form.appType}
          onChange={(e) => updateField('appType', e.target.value)}
          aria-label="Tipo de aplicación"
          aria-invalid={!!errors.appType}
          className={`appearance-none ${fieldClass('appType')} ${form.appType ? '' : 'text-white/40!'}`}
        >
          {APP_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-dark text-white">
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
        <div className="mt-1 flex justify-between">
          {errors.description
            ? <p className="text-xs text-red-400">{errors.description}</p>
            : <span />}
          <p className="text-xs text-white/30">{form.description.length}/{MAX_DESCRIPTION}</p>
        </div>
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
