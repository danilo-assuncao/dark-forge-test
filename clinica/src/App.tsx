import './App.css';
import { Triage } from './components/Triage';
import { Appointment } from './components/Appointment';
import { ExamBuilder } from './components/ExamBuilder';

const App = () => {
  return (
    <div className="app-container">
      <header>
        <h1>SPA Dan Med</h1>
      </header>
      <main className="main-content">
        <section aria-labelledby="triage-title">
          <h2 id="triage-title">Triagem de Sintomas</h2>
          <Triage />
        </section>
        
        <section aria-labelledby="appointment-title">
          <h2 id="appointment-title">Consultas</h2>
          <Appointment />
        </section>
        
        <section aria-labelledby="exams-title">
          <h2 id="exams-title">Exames e Check-up</h2>
          <ExamBuilder />
        </section>
      </main>
    </div>
  );
};

export default App;
