import { useState } from 'react'

interface DateTimePickerProps {
  onConfirm: (isoDate: string) => void
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8) // 8:00 - 18:00
const MINUTES = [0, 15, 30, 45]

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function formatISO(date: Date, hour: number, minute: number): string {
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  return `${y}-${m}-${d}T${pad(hour)}:${pad(minute)}:00.000-06:00`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function DateTimePicker({ onConfirm }: DateTimePickerProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null)

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth())

  const handleConfirm = () => {
    if (!selectedDate || selectedHour === null || selectedMinute === null) return
    onConfirm(formatISO(selectedDate, selectedHour, selectedMinute))
  }

  const isReady = selectedDate && selectedHour !== null && selectedMinute !== null

  return (
    <div className="space-y-3 p-3">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="rounded p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:invisible"
          aria-label="Mes anterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="text-xs font-semibold text-white">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="rounded p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Mes siguiente"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DAYS.map((d) => (
          <span key={d} className="text-[10px] font-medium text-white/40">{d}</span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDay }).map((_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const date = new Date(viewYear, viewMonth, day)
          const isPast = date < today
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          const disabled = isPast || isWeekend
          const isSelected = selectedDate && isSameDay(date, selectedDate)
          const isToday = isSameDay(date, today)

          return (
            <button
              key={day}
              disabled={disabled}
              onClick={() => setSelectedDate(date)}
              className={`flex h-7 w-full items-center justify-center rounded text-xs transition-colors
                ${disabled ? 'cursor-not-allowed text-white/15' : 'cursor-pointer text-white/80 hover:bg-white/10'}
                ${isSelected ? '!bg-primary !text-white font-semibold' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-primary/50' : ''}
              `}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Time selector - shown after date is selected */}
      {selectedDate && (
        <div className="space-y-2 border-t border-white/10 pt-3">
          <p className="text-[11px] font-medium text-white/60">Selecciona la hora:</p>
          <div className="flex flex-wrap gap-1.5">
            {HOURS.flatMap((h) =>
              MINUTES.map((m) => {
                const label = `${pad(h)}:${pad(m)}`
                const isActive = selectedHour === h && selectedMinute === m
                return (
                  <button
                    key={label}
                    onClick={() => { setSelectedHour(h); setSelectedMinute(m) }}
                    className={`rounded-md px-2 py-1 text-[11px] transition-colors
                      ${isActive
                        ? 'bg-primary text-white font-semibold'
                        : 'bg-white/5 text-white/70 hover:bg-white/15'
                      }
                    `}
                  >
                    {label}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Confirm button */}
      {isReady && (
        <button
          onClick={handleConfirm}
          className="w-full rounded-lg bg-primary py-2 text-xs font-semibold text-white transition-opacity hover:opacity-85"
        >
          Confirmar: {selectedDate!.getDate()} de {MONTHS[selectedDate!.getMonth()]}, {pad(selectedHour!)}: {pad(selectedMinute!)}
        </button>
      )}
    </div>
  )
}
