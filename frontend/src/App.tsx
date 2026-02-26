import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Trash2, Edit3, Save, X, Send, Calendar, Clock } from 'lucide-react';
import './index.css';

const API_BASE = '/api';

interface Birthday {
  id: number;
  name: string;
  day: number;
  month: number;
}

interface BotStatus {
  isReady: boolean;
  qr: string | null;
  lastReminder?: {
    timestamp: string | null;
    summary: string | null;
  };
  nextReminder?: {
    date: string;
    birthdayDate: string;
    name: string;
    type: string;
  };
}

const formatMonth = (month: number) => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return months[month - 1];
};

const FullMonths = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatTime = (isoString: string | null) => {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateShort = (isoString: string) => {
  const date = new Date(isoString);
  return `${date.getDate()} ${formatMonth(date.getMonth() + 1)}`;
};

interface DayPickerProps {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
}

const DayPicker = ({ value, onChange, onClose }: DayPickerProps) => {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  return (
    <div className="day-picker-popover">
      <div className="day-grid">
        {days.map(d => (
          <div
            key={d}
            className={`day-cell ${value === d.toString() ? 'selected' : ''}`}
            onClick={() => {
              onChange(d.toString());
              onClose();
            }}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
};

interface MonthPickerProps {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
}

const MonthPicker = ({ value, onChange, onClose }: MonthPickerProps) => {
  return (
    <div className="month-picker-popover">
      <div className="month-grid">
        {FullMonths.map((m, i) => (
          <div
            key={m}
            className={`month-cell ${value === (i + 1).toString() ? 'selected' : ''}`}
            onClick={() => {
              onChange((i + 1).toString());
              onClose();
            }}
          >
            {m}
          </div>
        ))}
      </div>
    </div>
  );
};

function App() {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [status, setStatus] = useState<BotStatus>({ isReady: false, qr: null });

  // Form State
  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('1');
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDay, setEditDay] = useState('');
  const [editMonth, setEditMonth] = useState('');
  const [showEditDayPicker, setShowEditDayPicker] = useState(false);
  const [showEditMonthPicker, setShowEditMonthPicker] = useState(false);

  useEffect(() => {
    fetchBirthdays();
    const interval = setInterval(fetchStatus, 3000);
    fetchStatus();
    return () => clearInterval(interval);
  }, []);

  const fetchBirthdays = async () => {
    try {
      const res = await fetch(`${API_BASE}/birthdays`);
      const data = await res.json();
      setBirthdays(data);
    } catch (err) {
      console.error('Error fetching birthdays:', err);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/bot/status`);
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !day || !month) return;
    try {
      await fetch(`${API_BASE}/birthdays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, day: parseInt(day), month: parseInt(month) })
      });
      setName('');
      setDay('');
      setMonth('1');
      await fetchBirthdays();
      await fetchStatus();
    } catch (err) {
      console.error('Error adding birthday:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este cumpleaños?')) return;
    try {
      await fetch(`${API_BASE}/birthdays/${id}`, { method: 'DELETE' });
      await fetchBirthdays();
      await fetchStatus();
    } catch (err) {
      console.error('Error deleting birthday:', err);
    }
  };

  const startEdit = (b: Birthday) => {
    setEditingId(b.id);
    setEditName(b.name);
    setEditDay(b.day.toString());
    setEditMonth(b.month.toString());
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await fetch(`${API_BASE}/birthdays/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, day: parseInt(editDay), month: parseInt(editMonth) })
      });
      setEditingId(null);
      await fetchBirthdays();
      await fetchStatus();
    } catch (err) {
      console.error('Error updating birthday:', err);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowEditDayPicker(false);
    setShowEditMonthPicker(false);
  };

  const handleSendTest = async (b: Birthday) => {
    if (!status.isReady) {
      alert('El bot de WhatsApp no está conectado. Por favor escanea el código QR primero.');
      return;
    }
    if (!confirm(`¿Enviar un recordatorio de prueba al grupo para ${b.name}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/bot/send-test/${b.id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Mensaje de prueba enviado con éxito!');
      } else {
        alert(`Error al enviar el mensaje: ${data.error}`);
      }
    } catch (err) {
      console.error('Error sending test message:', err);
      alert('Ocurrió un error de red al intentar enviar el mensaje.');
    }
  };

  return (
    <div className="fade-in">
      <header className="app-header">
        <h1 className="title-gradient">Recordatorios de Cumpleaños</h1>
        <p>Porque la memoria es frágil, pero el amor no.</p>
      </header>

      <div className="layout">
        <main className="glass-panel">
          <h2 style={{ marginBottom: '1rem' }}>Agregar</h2>
          <form className="add-form" onSubmit={handleAdd}>
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                placeholder=""
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Día</label>
              <div className="day-picker-container">
                <input
                  type="text"
                  readOnly
                  placeholder="Selec."
                  value={day}
                  onClick={() => {
                    setShowDayPicker(!showDayPicker);
                    setShowMonthPicker(false);
                  }}
                  required
                />
                {showDayPicker && (
                  <DayPicker
                    value={day}
                    onChange={setDay}
                    onClose={() => setShowDayPicker(false)}
                  />
                )}
              </div>
            </div>
            <div className="form-group">
              <label>Mes</label>
              <div className="day-picker-container">
                <input
                  type="text"
                  readOnly
                  placeholder="Selec."
                  value={FullMonths[parseInt(month) - 1]}
                  onClick={() => {
                    setShowMonthPicker(!showMonthPicker);
                    setShowDayPicker(false);
                  }}
                  required
                />
                {showMonthPicker && (
                  <MonthPicker
                    value={month}
                    onChange={setMonth}
                    onClose={() => setShowMonthPicker(false)}
                  />
                )}
              </div>
            </div>
            <button type="submit">Añadir</button>
          </form>

          <h2 style={{ marginBottom: '1.5rem' }}>Lista de Cumpleaños</h2>
          <div className="birthdays-list">
            {birthdays.map(b => (
              <div key={b.id} className="birthday-item">
                {editingId === b.id ? (
                  <div style={{ display: 'flex', gap: '1rem', flex: 1, alignItems: 'center' }}>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 4 }} />
                    <div className="day-picker-container" style={{ flex: 1.2 }}>
                      <input
                        type="text"
                        readOnly
                        value={editDay}
                        onClick={() => {
                          setShowEditDayPicker(!showEditDayPicker);
                          setShowEditMonthPicker(false);
                        }}
                      />
                      {showEditDayPicker && (
                        <DayPicker
                          value={editDay}
                          onChange={setEditDay}
                          onClose={() => setShowEditDayPicker(false)}
                        />
                      )}
                    </div>
                    <div className="day-picker-container" style={{ flex: 2.5 }}>
                      <input
                        type="text"
                        readOnly
                        value={FullMonths[parseInt(editMonth) - 1]}
                        onClick={() => {
                          setShowEditMonthPicker(!showEditMonthPicker);
                          setShowEditDayPicker(false);
                        }}
                      />
                      {showEditMonthPicker && (
                        <MonthPicker
                          value={editMonth}
                          onChange={setEditMonth}
                          onClose={() => setShowEditMonthPicker(false)}
                        />
                      )}
                    </div>
                    <div className="birthday-actions">
                      <button onClick={saveEdit} style={{ padding: '0.4rem' }} data-tooltip="Guardar"><Save size={18} /></button>
                      <button onClick={cancelEdit} className="danger outline" style={{ padding: '0.4rem' }} data-tooltip="Cancelar"><X size={18} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="birthday-info">
                      <div className="birthday-date">
                        <span>{b.day}</span>
                        {formatMonth(b.month)}
                      </div>
                      <div className="birthday-name">{b.name}</div>
                    </div>
                    <div className="birthday-actions">
                      <button className="outline" onClick={() => handleSendTest(b)} data-tooltip="Enviar Recordatorio"><Send size={18} /></button>
                      <button className="outline" onClick={() => startEdit(b)} data-tooltip="Editar"><Edit3 size={18} /></button>
                      <button className="danger outline" onClick={() => handleDelete(b.id)} data-tooltip="Eliminar"><Trash2 size={18} /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {birthdays.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No hay cumpleaños registrados.</p>}
          </div>
        </main>

        <aside className="glass-panel status-panel">
          <h3>Estado del Bot</h3>
          <div className="status-indicator">
            <div className={`dot ${status.isReady ? 'ready' : 'not-ready'}`}></div>
            <span>{status.isReady ? 'Conectado y Listo' : 'Desconectado'}</span>
          </div>

          {!status.isReady && status.qr && (
            <div className="qr-container fade-in">
              <QRCodeSVG value={status.qr} size={180} />
              <p className="scan-instructions">Vincular dispositivo para activar</p>
            </div>
          )}

          <div className="bot-logs">
            <div className="log-item">
              <span className="log-label"><Clock size={12} style={{ marginRight: '4px' }} /> Último envío</span>
              <span className="log-value">
                {status.lastReminder?.timestamp ? (
                  <>
                    <span className="log-time">{formatTime(status.lastReminder.timestamp)}</span> - {status.lastReminder.summary}
                  </>
                ) : 'Pendiente...'}
              </span>
            </div>
            <div className="log-item" style={{ borderTop: '1px solid #eee', paddingTop: '0.8rem' }}>
              <span className="log-label"><Calendar size={12} style={{ marginRight: '4px' }} /> Próximo cumpleaños</span>
              <span className="log-value">
                {status.nextReminder ? (
                  <>
                    <div className='birthday'>
                      {status.nextReminder.name} - {formatDateShort(status.nextReminder.birthdayDate)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Se envía recordatorio {status.nextReminder.type.toLowerCase()}, el {formatDateShort(status.nextReminder.date)}
                    </div>
                  </>
                ) : 'No hay cumpleaños próximos.'}
              </span>
            </div>
          </div>
        </aside>
      </div>

    </div>
  );
}

export default App;
