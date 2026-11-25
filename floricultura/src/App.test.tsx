import { render, screen } from '@testing-library/react'
import App from './App'
import { listFlowers } from './data/flowers'

describe('App', () => {
  it('renders the title and the flower catalog', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Dan Flores' })
    ).toBeInTheDocument()
    expect(screen.getByText('Girassol')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(listFlowers().length)
  })

  it('marks out-of-stock flowers', () => {
    render(<App />)
    const soldOut = listFlowers().filter((f) => f.stockStems === 0)
    expect(screen.queryAllByText('Esgotada')).toHaveLength(soldOut.length)
  })
})
