import { useState } from 'react';
import GroupSelectStep from './GroupSelectStep';
import WelcomeStep from './WelcomeStep';
import type { TeamConfig } from './types';

interface OnboardingWizardProps {
  apiBase: string;
  teamConfig: TeamConfig;
  onFinish: (config: TeamConfig) => void;
}

// El paso QR se decide en App.tsx (depende de status.isReady, que ya se poll-ea ahí).
// Este wizard cubre lo que sigue: elegir grupo, y una pantalla de bienvenida.
const OnboardingWizard = ({ apiBase, teamConfig, onFinish }: OnboardingWizardProps) => {
  const [config, setConfig] = useState<TeamConfig>(teamConfig);

  if (!config.groupJid) {
    return (
      <GroupSelectStep
        apiBase={apiBase}
        onSelected={(updated) => setConfig(updated)}
      />
    );
  }

  return (
    <WelcomeStep
      displayName={config.displayName}
      groupSubject={config.groupSubject}
      onContinue={() => onFinish(config)}
    />
  );
};

export default OnboardingWizard;
