export type BookingForm = {
  name: string
  email: string
  phone: string
  address: string
  date: string
  time: string
}

export type BookingErrors = Partial<Record<keyof BookingForm, string>>

export const EMPTY_BOOKING: BookingForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  date: '',
  time: ''
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export const OPENING_HOUR = '08:00'
export const CLOSING_HOUR = '18:00'

export const toIsoDate = (d: Date): string => {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const isRealDate = (value: string): boolean => {
  const m = DATE_RE.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d)
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d
}

export const validateBooking = (form: BookingForm, today: Date = new Date()): BookingErrors => {
  const errors: BookingErrors = {}
  if (form.name.trim().length < 3) errors.name = 'Enter your full name (at least 3 characters).'
  if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  const digits = form.phone.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 13) errors.phone = 'Enter a phone number with 10 to 13 digits.'
  if (form.address.trim().length < 5) errors.address = 'Enter the full address (at least 5 characters).'
  if (!isRealDate(form.date)) errors.date = 'Choose a valid date.'
  else if (form.date <= toIsoDate(today)) errors.date = 'Choose a date after today.'
  if (!TIME_RE.test(form.time)) errors.time = 'Choose a valid time.'
  else if (form.time < OPENING_HOUR || form.time > CLOSING_HOUR)
    errors.time = `Choose a time between ${OPENING_HOUR} and ${CLOSING_HOUR}.`
  return errors
}
