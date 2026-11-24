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

export type AddonId = 'toalha-quente' | 'vapor-ozonio'

export interface Addon {
  id: AddonId
  name: string
  durationMin: number
  priceCents: number
}

export const ADDONS: Record<AddonId, Addon> = {
  'toalha-quente': { id: 'toalha-quente', name: 'Toalha quente', durationMin: 5, priceCents: 1000 },
  'vapor-ozonio': { id: 'vapor-ozonio', name: 'Vapor de ozônio', durationMin: 10, priceCents: 1500 }
}

const isAddonId = (id: string): id is AddonId => Object.hasOwn(ADDONS, id)

const resolveAddons = (addonIds: string[]): Addon[] =>
  [...new Set(addonIds)].map((id) => {
    if (!isAddonId(id)) throw new Error(`Adicional desconhecido: ${id}`)
    return ADDONS[id]
  })

/** Total duration in minutes of the selected services plus add-ons. */
export const totalDurationMin = (services: Service[], addonIds: string[] = []): number =>
  services.reduce((sum, s) => sum + s.durationMin, 0) +
  resolveAddons(addonIds).reduce((sum, a) => sum + a.durationMin, 0)

/** Total price in cents of the selected services plus add-ons. */
export const totalPriceCents = (services: Service[], addonIds: string[] = []): number =>
  services.reduce((sum, s) => sum + s.priceCents, 0) +
  resolveAddons(addonIds).reduce((sum, a) => sum + a.priceCents, 0)

/** Whether the barber is free to start a block of `durationMin` at date/time. */
export const isBarberAvailable = (
  professional: Professional,
  durationMin: number,
  date: string,
  time: string,
  bookings: Booking[],
  servicesById: Record<string, Service>,
  now: Date
): boolean => {
  const block: Service = {
    id: 'block',
    name: 'block',
    category: 'combo',
    durationMin,
    priceCents: 0
  }
  return availableSlots(professional, block, date, bookings, servicesById, now).includes(time)
}

export interface Comanda {
  code: string // BRB-XXXX
  barberId: string
  clientName: string
  date: string
  time: string
  serviceIds: string[]
  addonIds: AddonId[]
  durationMin: number
  totalCents: number
}

const COMANDA_PATTERN = /^BRB-\d{4}$/

export const isComandaCode = (code: string): boolean => COMANDA_PATTERN.test(code)

/** Builds a BRB-XXXX code; `random` returns a value in [0, 1). */
export const generateComandaCode = (random: () => number = Math.random): string =>
  `BRB-${String(Math.min(9999, Math.floor(random() * 10000))).padStart(4, '0')}`

export interface AppointmentRequest {
  professional: Professional
  services: Service[]
  addonIds?: string[]
  date: string
  time: string
  clientName: string
}

export interface AppointmentContext {
  bookings: Booking[]
  servicesById: Record<string, Service>
  now?: Date
  random?: () => number
}

/** Validates the request and issues the comanda; throws on invalid input. */
export const confirmBarberAppointment = (
  request: AppointmentRequest,
  context: AppointmentContext
): Comanda => {
  const { professional, services, date, time } = request
  const clientName = request.clientName.trim()
  const addons = resolveAddons(request.addonIds ?? [])

  if (!clientName) throw new Error('Nome do cliente é obrigatório')
  if (services.length === 0) throw new Error('Selecione ao menos um serviço')
  const unsupported = services.find((s) => !professional.serviceIds.includes(s.id))
  if (unsupported) {
    throw new Error(`${professional.name} não realiza o serviço ${unsupported.id}`)
  }

  const durationMin = totalDurationMin(services, addons.map((a) => a.id))
  const available = isBarberAvailable(
    professional,
    durationMin,
    date,
    time,
    context.bookings,
    context.servicesById,
    context.now ?? new Date()
  )
  if (!available) throw new Error('Horário indisponível para o barbeiro')

  return {
    code: generateComandaCode(context.random),
    barberId: professional.id,
    clientName,
    date,
    time,
    serviceIds: services.map((s) => s.id),
    addonIds: addons.map((a) => a.id),
    durationMin,
    totalCents: totalPriceCents(services, addons.map((a) => a.id))
  }
}
