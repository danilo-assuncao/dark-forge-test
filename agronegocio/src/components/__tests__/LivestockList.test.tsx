import { render, screen } from '@testing-library/react' 
import { LivestockList } from '../LivestockList' 
import type { Livestock } from '../../types' 

describe('LivestockList', () => {
  const baseLivestock: Livestock = { id: '1', type: 'Bovinos', count: 1000, health: 'good', weight: 450 }

  it('should render livestock information', () => {
    render(<LivestockList livestock={[baseLivestock]} />) 
    
    expect(screen.getByText('Bovinos')).toBeInTheDocument() 
    expect(screen.getByText('1.000')).toBeInTheDocument() 
    expect(screen.getByText('Boa')).toBeInTheDocument() 
    expect(screen.getByText('450')).toBeInTheDocument() 
  }) 

  it.each([
    ['excellent', 'Excelente', 'bg-green-100 text-green-800'],
    ['good', 'Boa', 'bg-blue-100 text-blue-800'],
    ['fair', 'Razoável', 'bg-yellow-100 text-yellow-800'],
    ['poor', 'Ruim', 'bg-red-100 text-red-800'],
  ] as const)('should render health %s correctly', (health, expectedLabel, expectedClass) => {
    render(<LivestockList livestock={[{ ...baseLivestock, health }]} />) 
    const badge = screen.getByText(expectedLabel)
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain(expectedClass)
  })

  it('should handle empty list', () => {
    render(<LivestockList livestock={[]} />)
    expect(screen.getByText('Rebanho')).toBeInTheDocument()
    expect(screen.queryByText('Bovinos')).not.toBeInTheDocument()
  })

  it('should render multiple rows', () => {
    render(<LivestockList livestock={[baseLivestock, { ...baseLivestock, id: '2', type: 'Suínos' }]} />)
    expect(screen.getByText('Bovinos')).toBeInTheDocument()
    expect(screen.getByText('Suínos')).toBeInTheDocument()
  })
}) 