import { render, screen } from '@testing-library/react' 
import { LivestockList } from '../LivestockList' 
import type { Livestock } from '../../types' 

const mockLivestock: Livestock[] = [
  { id: '1', type: 'Bovinos', count: 1000, health: 'good', weight: 450 },
] 

describe('LivestockList', () => {
  it('should render livestock information', () => {
    render(<LivestockList livestock={mockLivestock} />) 
    
    expect(screen.getByText('Bovinos')).toBeInTheDocument() 
    expect(screen.getByText('1,000')).toBeInTheDocument() 
    expect(screen.getByText('Boa')).toBeInTheDocument() 
    expect(screen.getByText('450')).toBeInTheDocument() 
  }) 
}) 