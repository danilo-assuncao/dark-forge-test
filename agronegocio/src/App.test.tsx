import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('should render main sections', () => {
    render(<App />)
    expect(screen.getByText('AgroDashboard')).toBeInTheDocument()
    expect(screen.getByText('Área Total Plantada')).toBeInTheDocument()
    expect(screen.getAllByText('Culturas').length).toBeGreaterThan(0)
    expect(screen.getByText('Rebanho')).toBeInTheDocument()
  })
})