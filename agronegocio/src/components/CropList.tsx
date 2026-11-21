import type { Crop } from '../types' 

interface CropListProps {
  crops: Crop[] 
}

const statusMap = {
  planting: { label: 'Plantio', color: 'bg-blue-100 text-blue-800' },
  growing: { label: 'Crescimento', color: 'bg-yellow-100 text-yellow-800' },
  harvesting: { label: 'Colheita', color: 'bg-orange-100 text-orange-800' },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
} 

export const CropList = ({ crops }: CropListProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Culturas</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 px-4 text-gray-600 font-semibold">Cultura</th>
              <th className="py-3 px-4 text-gray-600 font-semibold">Área (ha)</th>
              <th className="py-3 px-4 text-gray-600 font-semibold">Status</th>
              <th className="py-3 px-4 text-gray-600 font-semibold">Produção Est. (t)</th>
            </tr>
          </thead>
          <tbody>
            {crops.map((crop) => (
              <tr key={crop.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-800 font-medium">{crop.name}</td>
                <td className="py-3 px-4 text-gray-600">{crop.area}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[crop.status].color}`}>
                    {statusMap[crop.status].label}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600">{crop.yieldEstimate.toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ) 
} 