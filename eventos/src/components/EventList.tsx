import { useState } from 'react';
import { listEvents, filterEventsByCity } from '../data/events';
import type { LiveEventItem } from '../types';

interface EventListProps {
  onSelectEvent: (event: LiveEventItem) => void;
}

export function EventList({ onSelectEvent }: EventListProps) {
  const [city, setCity] = useState('');
  const [events, setEvents] = useState<LiveEventItem[]>(listEvents());

  const handleFilter = () => {
    if (city.trim() === '') {
      setEvents(listEvents());
    } else {
      setEvents(filterEventsByCity(city));
    }
  };

  return (
    <div className="event-list">
      <h2>Shows</h2>
      <div className="filter">
        <label htmlFor="city-filter">Cidade:</label>
        <input 
          id="city-filter"
          type="text" 
          placeholder="Filtrar por cidade" 
          value={city} 
          onChange={(e) => setCity(e.target.value)} 
        />
        <button onClick={handleFilter}>Buscar</button>
      </div>
      <ul className="events">
        {events.map(event => (
          <li key={event.id} className="event-item">
            <div>
              <h3>{event.name}</h3>
              <p>{event.city} - {event.date}</p>
              <p>A partir de R$ {event.price}</p>
            </div>
            <button onClick={() => onSelectEvent(event)}>Comprar Ingresso</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
