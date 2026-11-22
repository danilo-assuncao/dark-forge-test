import React, { useState } from 'react';
import './App.css';
import { CalculatorPanel } from './components/CalculatorPanel';
import { TrackingPanel } from './components/TrackingPanel';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'tracking'>('calculator');

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Dan Cargo</h1>
        <nav className="tabs">
          <button 
            className={activeTab === 'calculator' ? 'active' : ''} 
            onClick={() => setActiveTab('calculator')}
          >
            Calculadora / Despacho
          </button>
          <button 
            className={activeTab === 'tracking' ? 'active' : ''} 
            onClick={() => setActiveTab('tracking')}
          >
            Rastreamento
          </button>
        </nav>
      </header>
      
      <main className="app-main">
        {activeTab === 'calculator' && <CalculatorPanel />}
        {activeTab === 'tracking' && <TrackingPanel />}
      </main>
    </div>
  );
};

export default App;
