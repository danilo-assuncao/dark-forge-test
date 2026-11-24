import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('updates the total as area, package and extras change', () => {
    render(<App />)
    expect(screen.getByTestId('total').textContent).toContain('$270.00')
    fireEvent.change(screen.getByLabelText('Area (m²)'), { target: { value: '100' } })
    expect(screen.getByTestId('total').textContent).toContain('$450.00')
    fireEvent.click(screen.getByLabelText(/Heavy/))
    expect(screen.getByTestId('total').textContent).toContain('$750.00')
    fireEvent.click(screen.getByLabelText(/Window cleaning/))
    expect(screen.getByTestId('total').textContent).toContain('$810.00')
  })

  it('shows an error and disables booking for an invalid area', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Area (m²)'), { target: { value: '5' } })
    expect(screen.getByRole('alert').textContent).toContain('between 10 and 1000')
    expect(screen.getByRole('button', { name: 'Confirm booking' })).toHaveProperty('disabled', true)
  })

  it('shows validation errors on an empty submit and confirms a valid one', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm booking' }))
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()

    const set = (l: string, v: string) => fireEvent.change(screen.getByLabelText(l), { target: { value: v } })
    const next = new Date(Date.now() + 2 * 86400000)
    const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
    set('Full name', 'Maria Silva')
    set('Email', 'maria@example.com')
    set('Phone', '11912345678')
    set('Address', '12 Main Street')
    set('Date', iso)
    set('Time', '10:00')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm booking' }))
    expect(screen.getByRole('status').textContent).toContain('Booking confirmed')
  })
})
