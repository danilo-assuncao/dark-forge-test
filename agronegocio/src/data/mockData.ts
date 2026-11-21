import type { Crop, Livestock, DashboardData } from '../types' 

export const mockCrops: Crop[] = [
  { id: '1', name: 'Soja', area: 500, status: 'growing', yieldEstimate: 1800 },
  { id: '2', name: 'Milho', area: 300, status: 'planting', yieldEstimate: 2100 },
  { id: '3', name: 'Trigo', area: 200, status: 'harvesting', yieldEstimate: 600 },
  { id: '4', name: 'Algodão', area: 150, status: 'growing', yieldEstimate: 450 },
] 

export const mockLivestock: Livestock[] = [
  { id: '1', type: 'Bovinos de Corte', count: 1200, health: 'excellent', weight: 450 },
  { id: '2', type: 'Bovinos de Leite', count: 300, health: 'good', weight: 380 },
  { id: '3', type: 'Suínos', count: 850, health: 'good', weight: 110 },
  { id: '4', type: 'Aves', count: 5000, health: 'fair', weight: 2.5 },
] 

export const mockDashboardData: DashboardData = {
  totalArea: 1150,
  totalLivestock: 7350,
  revenue: 2540000,
  expenses: 1120000,
} 