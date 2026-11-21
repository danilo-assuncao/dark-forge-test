import { Header } from './components/Header' 
import { SummaryCards } from './components/SummaryCards' 
import { CropList } from './components/CropList' 
import { LivestockList } from './components/LivestockList' 
import { mockCrops, mockLivestock, mockDashboardData } from './data/mockData' 

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
        <SummaryCards data={mockDashboardData} />
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <CropList crops={mockCrops} />
          <LivestockList livestock={mockLivestock} />
        </div>
      </main>
    </div>
  ) 
}

export default App 