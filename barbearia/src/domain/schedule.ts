import type { Booking, Professional, Service } from '../types'

const SLOT_STEP_MIN = 30

export const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const toTime = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export const parseDate = (date: string): Date => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const formatDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const formatPrice = (cents: number): string =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const professionalsForService = (
  all: Professional[],
  serviceId: string
): Professional[] => all.filter((p) => p.serviceIds.includes(serviceId))

export const nextDays = (from: Date, count: number): string[] =>
  Array.from({ length: count }, (_, i) =>
    formatDate(new Date(from.getFullYear(), from.getMonth(), from.getDate() + i))
  )

/** Available start times for a professional/service on a date. */
export const availableSlots = (
  professional: Professional,
  service: Service,
  date: string,
  bookings: Booking[],
  servicesById: Record<string, Service>,
  now: Date
): string[] => {
  const day = parseDate(date)
  if (!professional.workDays.includes(day.getDay())) return []

  const busy = bookings
    .filter((b) => b.professionalId === professional.id && b.date === date)
    .map((b) => {
      const start = toMinutes(b.time)
      return { start, end: start + (servicesById[b.serviceId]?.durationMin ?? SLOT_STEP_MIN) }
    })

  const isToday = formatDate(now) === date
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const open = professional.startHour * 60
  const close = professional.endHour * 60
  const slots: string[] = []

  for (let start = open; start + service.durationMin <= close; start += SLOT_STEP_MIN) {
    const end = start + service.durationMin
    if (isToday && start <= nowMin) continue
    if (busy.some((b) => start < b.end && b.start < end)) continue
    slots.push(toTime(start))
  }
  return slots
}
