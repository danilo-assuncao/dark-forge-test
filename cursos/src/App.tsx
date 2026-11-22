import { useState, useMemo } from 'react';
import { listTracks, filterTracksByLevel } from './data/tracks';
import { quoteEnrollment, EnrollmentModality } from './domain/enrollment';
import { issueTrackCertificate } from './domain/progress';
import { CourseTrack, TrackLevel } from './types';
import './App.css';

export default function App() {
  const [levelFilter, setLevelFilter] = useState<TrackLevel | 'todos'>('todos');
  const [completedLessons, setCompletedLessons] = useState<Record<string, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, boolean[]>>({});
  const [certificates, setCertificates] = useState<Record<string, string>>({});
  const [certificateErrors, setCertificateErrors] = useState<Record<string, string>>({});
  
  const [cartTracks, setCartTracks] = useState<string[]>([]);
  const [modality, setModality] = useState<EnrollmentModality>('avulsa');
  const [isStudent, setIsStudent] = useState(false);
  const [coupon, setCoupon] = useState('');

  const tracks = useMemo(() => {
    if (levelFilter === 'todos') {
      return listTracks();
    }
    return filterTracksByLevel(levelFilter);
  }, [levelFilter]);

  const toggleLesson = (trackId: string, lessonId: string) => {
    setCompletedLessons(prev => ({ ...prev, [lessonId]: !prev[lessonId] }));
    setCertificates(prev => { const n = { ...prev }; delete n[trackId]; return n; });
    setCertificateErrors(prev => { const n = { ...prev }; delete n[trackId]; return n; });
  };

  const handleQuizAnswer = (track: CourseTrack, index: number, isCorrect: boolean) => {
    setQuizAnswers(prev => {
      const current = prev[track.id] || new Array(track.lessons.length).fill(false);
      const updated = [...current];
      updated[index] = isCorrect;
      return { ...prev, [track.id]: updated };
    });
    setCertificates(prev => { const n = { ...prev }; delete n[track.id]; return n; });
    setCertificateErrors(prev => { const n = { ...prev }; delete n[track.id]; return n; });
  };

  const handleIssueCertificate = (track: CourseTrack) => {
    const trackCompletedIds = track.lessons.filter(l => completedLessons[l.id]).map(l => l.id);
    const trackQuizAnswers = quizAnswers[track.id] || new Array(track.lessons.length).fill(false);
    
    try {
      const cert = issueTrackCertificate({
        trackId: track.id,
        completedLessonIds: trackCompletedIds,
        quizAnswers: trackQuizAnswers
      }, 'user-123'); // Demo simulated user ID
      
      if (cert) {
        setCertificates(prev => ({ ...prev, [track.id]: cert }));
        setCertificateErrors(prev => { const n = { ...prev }; delete n[track.id]; return n; });
      } else {
        setCertificates(prev => { const n = { ...prev }; delete n[track.id]; return n; });
        setCertificateErrors(prev => ({ ...prev, [track.id]: 'Não foi possível emitir o certificado. Complete 100% das aulas e acerte pelo menos 70% do quiz.' }));
      }
    } catch (e: unknown) {
      setCertificates(prev => { const n = { ...prev }; delete n[track.id]; return n; });
      setCertificateErrors(prev => ({ ...prev, [track.id]: e instanceof Error ? e.message : String(e) }));
    }
  };

  const toggleCart = (trackId: string) => {
    setCartTracks(prev => prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]);
  };

  const quoteResult = useMemo(() => {
    if (cartTracks.length === 0) return null;
    try {
      return {
        quote: quoteEnrollment({
          trackIds: cartTracks,
          modality,
          isStudentScholarship: isStudent,
          coupon
        }),
        error: null
      };
    } catch (e: unknown) {
      return {
        quote: null,
        error: e instanceof Error ? e.message : String(e)
      };
    }
  }, [cartTracks, modality, isStudent, coupon]);

  return (
    <div className="app-container">
      <header>
        <h1>Dan Academy</h1>
      </header>

      <main className="main-content">
        <section className="tracks-section">
          <h2>Trilhas de Estudo</h2>
          <div className="filters">
            <label>
              Nível: 
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as any)}>
                <option value="todos">Todos</option>
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
              </select>
            </label>
          </div>

          <div className="track-list">
            {tracks.map(track => {
              const trackQuiz = quizAnswers[track.id] || new Array(track.lessons.length).fill(false);
              const cert = certificates[track.id];
              const certError = certificateErrors[track.id];
              const inCart = cartTracks.includes(track.id);

              return (
                <div key={track.id} className="track-card">
                  <h3>{track.title} <span className="badge">{track.level}</span></h3>
                  
                  <button className="cart-btn" onClick={() => toggleCart(track.id)}>
                    {inCart ? 'Remover do Carrinho' : 'Adicionar ao Carrinho'}
                  </button>

                  <div className="lessons">
                    <h4>Aulas</h4>
                    {track.lessons.map(lesson => (
                      <div key={lesson.id} className="lesson-item">
                        <label>
                          <input 
                            type="checkbox" 
                            checked={!!completedLessons[lesson.id]} 
                            onChange={() => toggleLesson(track.id, lesson.id)} 
                          />
                          {lesson.title} ({lesson.durationMinutes} min)
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="quiz">
                    <h4>Simulador de Quiz de Avaliação</h4>
                    {track.lessons.map((lesson, idx) => (
                      <div key={`quiz-${lesson.id}`} className="quiz-item">
                        <label>
                          Questão {idx + 1}: 
                          <select 
                            value={trackQuiz[idx] ? 'correct' : 'wrong'}
                            onChange={(e) => handleQuizAnswer(track, idx, e.target.value === 'correct')}
                          >
                            <option value="wrong">Incorreta</option>
                            <option value="correct">Correta</option>
                          </select>
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="certificate-section">
                    <button className="cert-btn" onClick={() => handleIssueCertificate(track)}>Emitir Certificado</button>
                    {cert && <div className="certificate-code">Certificado: <strong>{cert}</strong></div>}
                    {certError && <div className="certificate-error">{certError}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="cart-section">
          <h2>Carrinho de Matrícula (Simulador)</h2>
          {cartTracks.length === 0 ? (
            <p>Seu carrinho está vazio.</p>
          ) : (
            <div className="cart-details">
              <div className="cart-controls">
                <label>
                  Modalidade:
                  <select value={modality} onChange={(e) => setModality(e.target.value as EnrollmentModality)}>
                    <option value="avulsa">Avulsa</option>
                    <option value="passaporte">Passaporte (2+ cursos, 25% OFF)</option>
                  </select>
                </label>

                {modality === 'avulsa' && (
                  <>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={isStudent} 
                        onChange={(e) => setIsStudent(e.target.checked)} 
                      />
                      Bolsa Estudante (15% OFF)
                    </label>
                    <label>
                      Cupom de Desconto:
                      <input 
                        type="text" 
                        value={coupon} 
                        onChange={(e) => setCoupon(e.target.value)} 
                        placeholder="Ex: DANEDU20"
                      />
                    </label>
                  </>
                )}
              </div>

              {quoteResult?.quote && (
                <div className="quote-result">
                  <p>Subtotal: <span>R$ {quoteResult.quote.totalOriginal}</span></p>
                  <p>Desconto: <span>R$ {quoteResult.quote.totalDiscount}</span></p>
                  <p className="total-price">Total: <span>R$ {quoteResult.quote.totalFinal}</span></p>
                  {quoteResult.quote.appliedDiscounts.length > 0 && (
                    <p className="applied-discounts">
                      Descontos aplicados: {quoteResult.quote.appliedDiscounts.join(', ')}
                    </p>
                  )}
                </div>
              )}
              {quoteResult?.error && (
                <div className="quote-error">
                  <p>Erro ao cotar matrícula: {quoteResult.error}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
