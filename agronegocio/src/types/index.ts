export interface Crop {
  id: string 
  name: string 
  area: number  // in hectares
  status: 'planting' | 'growing' | 'harvesting' | 'completed' 
  yieldEstimate: number  // in tons
}

export interface Livestock {
  id: string 
  type: string 
  count: number 
  health: 'excellent' | 'good' | 'fair' | 'poor' 
  weight: number  // average weight in kg
}

export interface DashboardData {
  totalArea: number 
  totalLivestock: number 
  revenue: number 
  expenses: number 
}