interface WelcomeStepProps {
  displayName: string;
  groupSubject: string | null;
  onContinue: () => void;
}

const WelcomeStep = ({ displayName, groupSubject, onContinue }: WelcomeStepProps) => (
  <div className="fade-in onboarding-screen">
    <div className="glass-panel onboarding-card">
      <h1 className="title-gradient">¡Listo, {displayName}! 🎉</h1>
      <p className="onboarding-subtitle">
        Cada mañana a las 8:00 AM el bot revisa los cumpleaños y le manda a <strong>{groupSubject}</strong> un
        mensaje por cada persona próxima a cumplir años: una semana antes, un día antes, y el mismo día.
      </p>
      <button onClick={onContinue}>Ir al panel</button>
    </div>
  </div>
);

export default WelcomeStep;
