import { render, screen } from '@testing-library/react' 
import { CropList } from '../CropList' 
import type { Crop } from '../../types' 

const mockCrops: Crop[] = [
  { id: '1', name: 'Soja', area: 500, status: 'growing', yieldEstimate: 1800 },
] 

describe('CropList', () => {
  it('should render crop information', () => {
    render(<CropList crops={mockCrops} />) 
    
    expect(screen.getByText('Soja')).toBeInTheDocument() 
    expect(screen.getByText('500')).toBeInTheDocument() 
    expect(screen.getByText('Crescimento')).toBeInTheDocument() 
    expect(screen.getByText('1,800')).toBeInTheDocument() 
  }) 
}) 