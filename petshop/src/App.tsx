import { useState } from 'react'
import './App.css'
import GroomingTab from './components/GroomingTab'
import HealthTab from './components/HealthTab'

type TabId = 'grooming' | 'health'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('grooming')

  return (
    <div className="container">
      <h1>Dan Pet</h1>
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'grooming' ? 'active' : ''}`}
          onClick={() => setActiveTab('grooming')}
        >
          Banho & Tosa
        </button>
        <button
          className={`tab-button ${activeTab === 'health' ? 'active' : ''}`}
          onClick={() => setActiveTab('health')}
        >
          Saúde & Nutrição
        </button>
      </div>

      {activeTab === 'grooming' && <GroomingTab />}
      {activeTab === 'health' && <HealthTab />}
    </div>
  )
}
