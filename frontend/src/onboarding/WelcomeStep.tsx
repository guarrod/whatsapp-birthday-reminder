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
        A partir de ahora, <strong>{groupSubject}</strong> recibirá recordatorios de cumpleaños todos los días a las 8:00 AM.
      </p>
      <button onClick={onContinue}>Ir al panel</button>
    </div>
  </div>
);

export default WelcomeStep;
