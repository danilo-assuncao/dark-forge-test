import { render, screen } from '@testing-library/react' 
import { Header } from '../Header' 

describe('Header', () => {
  it('should render the app title', () => {
    render(<Header />) 
    expect(screen.getByText('AgroDashboard')).toBeInTheDocument() 
  }) 

  it('should render all navigation links', () => {
    render(<Header />)
    expect(screen.getByRole('link', { name: 'Início' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Culturas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Relatórios' })).toBeInTheDocument()
  })
}) 