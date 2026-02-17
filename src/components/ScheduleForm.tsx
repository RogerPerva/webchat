import { useState } from 'react'
import type { AppointmentData } from '../services/chatApi'

interface ScheduleFormProps {
  onSubmit: (data: AppointmentData) => void
  onCancel: () => void
}

type ValidatedField = 'name' | 'phone' | 'email' | 'appType' | 'description'
type FormErrors = Partial<Record<ValidatedField, string>>

const MAX_DESCRIPTION = 500

const APP_TYPE_OPTIONS = [
  { value: '', label: 'Selecciona tipo de aplicación *' },
  { value: 'Web App', label: 'Web App' },
  { value: 'Landing Page', label: 'Landing Page' },
  { value: 'Móvil App', label: 'Móvil App' },
  { value: 'Automatización', label: 'Automatización' },
  { value: 'Otra', label: 'Otra' },
]

export default function ScheduleForm({ onSubmit, onCancel }: ScheduleFormProps) {
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
    if (!form.email.trim()) e.email = 'El correo es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Ingresa un correo válido'
    if (!form.appType) e.appType = 'Selecciona un tipo de aplicación'
    if (!form.description.trim()) e.description = 'La descripción es requerida'
    else if (form.description.length > MAX_DESCRIPTION) e.description = `Máximo ${MAX_DESCRIPTION} caracteres`

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (validate()) onSubmit(form)
  }

  const updateField = (field: keyof AppointmentData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field as ValidatedField]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const fieldClass = (field: ValidatedField) =>
    `w-full rounded-lg border bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none transition-colors focus:border-primary ${
      errors[field] ? 'border-red-500' : 'border-white/10'
    }`

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
          className={fieldClass('name')}
        />
        {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
      </div>

      <div>
        <input
          type="tel"
          placeholder="Teléfono de contacto *"
          value={form.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          aria-label="Teléfono de contacto"
          aria-invalid={!!errors.phone}
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

      <div>
        <input
          type="text"
          placeholder="Presupuesto (opcional)"
          value={form.budget}
          onChange={(e) => updateField('budget', e.target.value)}
          aria-label="Presupuesto"
          className={fieldClass('name').replace('border-red-500', 'border-white/10')}
        />
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
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-gray-light transition-colors hover:bg-white/10"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
        >
          Enviar
        </button>
      </div>
    </form>
  )
}
