import type { Livestock } from '../types' 

interface LivestockListProps {
  livestock: Livestock[] 
}

const healthMap = {
  excellent: { label: 'Excelente', color: 'bg-green-100 text-green-800' },
  good: { label: 'Boa', color: 'bg-blue-100 text-blue-800' },
  fair: { label: 'Razoável', color: 'bg-yellow-100 text-yellow-800' },
  poor: { label: 'Ruim', color: 'bg-red-100 text-red-800' },
} 

export const LivestockList = ({ livestock }: LivestockListProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Rebanho</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 px-4 text-gray-600 font-semibold">Tipo</th>
              <th className="py-3 px-4 text-gray-600 font-semibold">Quantidade</th>
              <th className="py-3 px-4 text-gray-600 font-semibold">Saúde</th>
              <th className="py-3 px-4 text-gray-600 font-semibold">Peso Médio (kg)</th>
            </tr>
          </thead>
          <tbody>
            {livestock.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-800 font-medium">{item.type}</td>
                <td className="py-3 px-4 text-gray-600">{item.count.toLocaleString()}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${healthMap[item.health].color}`}>
                    {healthMap[item.health].label}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600">{item.weight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ) 
} 