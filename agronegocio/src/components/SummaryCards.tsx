import type { DashboardData } from '../types' 

interface SummaryCardsProps {
  data: DashboardData 
}

export const SummaryCards = ({ data }: SummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-gray-500 text-sm font-medium uppercase">Área Total Plantada</h3>
        <p className="text-3xl font-bold text-gray-800 mt-2">{data.totalArea} ha</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-gray-500 text-sm font-medium uppercase">Total de Animais</h3>
        <p className="text-3xl font-bold text-gray-800 mt-2">{data.totalLivestock.toLocaleString()}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-gray-500 text-sm font-medium uppercase">Receita Estimada</h3>
        <p className="text-3xl font-bold text-green-600 mt-2">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.revenue)}
        </p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-gray-500 text-sm font-medium uppercase">Despesas</h3>
        <p className="text-3xl font-bold text-red-600 mt-2">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.expenses)}
        </p>
      </div>
    </div>
  ) 
} 