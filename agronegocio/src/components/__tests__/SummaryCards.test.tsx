import { render, screen } from '@testing-library/react' 
import { SummaryCards } from '../SummaryCards' 

const mockData = {
  totalArea: 1000,
  totalLivestock: 5000,
  revenue: 1500000,
  expenses: 500000,
} 

describe('SummaryCards', () => {
  it('should render all summary information correctly', () => {
    render(<SummaryCards data={mockData} />) 
    
    expect(screen.getByText('Área Total Plantada')).toBeInTheDocument() 
    expect(screen.getByText('1.000 ha')).toBeInTheDocument() 
    
    expect(screen.getByText('Total de Animais')).toBeInTheDocument() 
    expect(screen.getByText('5.000')).toBeInTheDocument() 
    
    expect(screen.getByText('Receita Estimada')).toBeInTheDocument() 
    expect(screen.getByText(/R\$\s?1\.500\.000,00/)).toBeInTheDocument() 
    
    expect(screen.getByText('Despesas')).toBeInTheDocument() 
    expect(screen.getByText(/R\$\s?500\.000,00/)).toBeInTheDocument() 
  }) 
}) 