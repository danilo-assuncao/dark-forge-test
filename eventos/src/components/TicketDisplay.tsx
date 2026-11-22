interface TicketDisplayProps {
  code: string;
  onReset: () => void;
}

export function TicketDisplay({ code, onReset }: TicketDisplayProps) {
  return (
    <div className="ticket-display">
      <h2>Ingresso Emitido com Sucesso!</h2>
      <div className="ticket-code">
        <strong data-testid="ticket-code">{code}</strong>
      </div>
      <button onClick={onReset}>Comprar Outro</button>
    </div>
  );
}
