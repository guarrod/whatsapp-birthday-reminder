import { useEffect, useState } from 'react';
import type { TeamConfig, WhatsAppGroup } from './types';

interface GroupSelectStepProps {
  apiBase: string;
  onSelected: (config: TeamConfig) => void;
}

const GroupSelectStep = ({ apiBase, onSelected }: GroupSelectStepProps) => {
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch(`${apiBase}/bot/groups`);
        if (!res.ok) throw new Error('No se pudieron cargar los grupos');
        setGroups(await res.json());
      } catch (err) {
        console.error('Error fetching groups:', err);
        setError('No se pudieron cargar tus grupos de WhatsApp. Intenta recargar la página.');
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, [apiBase]);

  const handleSelect = async (group: WhatsAppGroup) => {
    setSaving(group.id);
    try {
      const res = await fetch(`${apiBase}/team/group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid: group.id, subject: group.subject }),
      });
      if (!res.ok) throw new Error('No se pudo guardar el grupo');
      onSelected(await res.json());
    } catch (err) {
      console.error('Error saving group:', err);
      setError('No se pudo guardar el grupo elegido. Intenta de nuevo.');
      setSaving(null);
    }
  };

  return (
    <div className="fade-in onboarding-screen">
      <div className="glass-panel onboarding-card">
        <h1 className="title-gradient">¿A qué grupo mandamos los recordatorios?</h1>
        <p className="onboarding-subtitle">Elige el grupo de WhatsApp donde tu equipo quiere recibir los avisos de cumpleaños.</p>

        {loading && <p className="onboarding-muted">Cargando tus grupos...</p>}
        {error && <p className="onboarding-muted">{error}</p>}
        {!loading && !error && groups.length === 0 && (
          <p className="onboarding-muted">No encontramos grupos en este número. Añade el bot a un grupo de WhatsApp y vuelve a cargar la página.</p>
        )}

        <div className="group-list">
          {groups.map(g => (
            <button
              key={g.id}
              className="group-item outline"
              disabled={saving !== null}
              onClick={() => handleSelect(g)}
            >
              {saving === g.id ? 'Guardando...' : g.subject}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GroupSelectStep;
