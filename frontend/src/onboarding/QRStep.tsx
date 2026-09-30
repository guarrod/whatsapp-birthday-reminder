import { QRCodeSVG } from 'qrcode.react';

interface QRStepProps {
  qr: string | null;
}

const QRStep = ({ qr }: QRStepProps) => (
  <div className="fade-in onboarding-screen">
    <div className="glass-panel onboarding-card">
      <h1 className="title-gradient">Vincula tu WhatsApp</h1>
      <p className="onboarding-subtitle">
        Escanea este código desde WhatsApp en tu teléfono (Ajustes → Dispositivos vinculados) para activar tu bot.
      </p>
      {qr ? (
        <div className="qr-container fade-in">
          <QRCodeSVG value={qr} size={220} />
        </div>
      ) : (
        <p className="onboarding-muted">Generando código QR...</p>
      )}
    </div>
  </div>
);

export default QRStep;
