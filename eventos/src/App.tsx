import { useState } from 'react'
import { EventList } from './components/EventList'
import { OrderForm } from './components/OrderForm'
import { TicketDisplay } from './components/TicketDisplay'
import type { LiveEventItem } from './types'
import './App.css'

function App() {
  const [selectedEvent, setSelectedEvent] = useState<LiveEventItem | null>(null);
  const [ticketCode, setTicketCode] = useState<string | null>(null);

  const handleSelectEvent = (event: LiveEventItem) => {
    setSelectedEvent(event);
  };

  const handleIssueTicket = (code: string) => {
    setTicketCode(code);
  };

  const handleReset = () => {
    setSelectedEvent(null);
    setTicketCode(null);
  };

  return (
    <div className="app">
      <header>
        <h1>Dan Tickets</h1>
      </header>
      <main>
        {!selectedEvent && !ticketCode && (
          <EventList onSelectEvent={handleSelectEvent} />
        )}
        {selectedEvent && !ticketCode && (
          <OrderForm 
            event={selectedEvent} 
            onIssueTicket={handleIssueTicket} 
            onCancel={() => setSelectedEvent(null)}
          />
        )}
        {ticketCode && (
          <TicketDisplay code={ticketCode} onReset={handleReset} />
        )}
      </main>
    </div>
  )
}

export default App
