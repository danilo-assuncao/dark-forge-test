import { render, screen } from '@testing-library/react' 
import { CropList } from '../CropList' 
import type { Crop } from '../../types' 

describe('CropList', () => {
  const baseCrop: Crop = { id: '1', name: 'Soja', area: 500, status: 'growing', yieldEstimate: 1800 } 

  it('should render crop information', () => {
    render(<CropList crops={[baseCrop]} />) 
    
    expect(screen.getByText('Soja')).toBeInTheDocument() 
    expect(screen.getByText('500')).toBeInTheDocument() 
    expect(screen.getByText('Crescimento')).toBeInTheDocument() 
    expect(screen.getByText('1.800')).toBeInTheDocument() 
  }) 

  it.each([
    ['planting', 'Plantio', 'bg-blue-100 text-blue-800'],
    ['growing', 'Crescimento', 'bg-yellow-100 text-yellow-800'],
    ['harvesting', 'Colheita', 'bg-orange-100 text-orange-800'],
    ['completed', 'Concluído', 'bg-green-100 text-green-800'],
  ] as const)('should render status %s correctly', (status, expectedLabel, expectedClass) => {
    render(<CropList crops={[{ ...baseCrop, status }]} />) 
    const badge = screen.getByText(expectedLabel)
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain(expectedClass)
  })

  it('should handle empty list', () => {
    render(<CropList crops={[]} />)
    expect(screen.getByText('Culturas')).toBeInTheDocument()
    expect(screen.queryByText('Soja')).not.toBeInTheDocument()
  })

  it('should render multiple rows', () => {
    render(<CropList crops={[baseCrop, { ...baseCrop, id: '2', name: 'Milho' }]} />)
    expect(screen.getByText('Soja')).toBeInTheDocument()
    expect(screen.getByText('Milho')).toBeInTheDocument()
  })
}) 