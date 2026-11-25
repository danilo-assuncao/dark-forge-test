import { render, screen, within } from '@testing-library/react'
import App from './App'
import { listBakes } from './data/bakes'

describe('App', () => {
  it('renders the title and the morning bakes', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Padaria' })).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Fornadas' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(listBakes().length)
    expect(within(list).getByText('Pão francês')).toBeInTheDocument()
    expect(within(list).getByText(/Pão · sai às 05:30/)).toBeInTheDocument()
  })
})
