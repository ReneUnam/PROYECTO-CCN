import { useEffect, useState } from 'react';
import { useUsernames } from './useUsernames';

type Alert = {
  user_id: string;
  risk_type: string;
  score: number;
  timestamp: string;
};

async function fetchAlerts(): Promise<{ alerts: Alert[] }> {
  const res = await fetch('/alerts');
  if (!res.ok) throw new Error('Error al obtener alertas');
  return await res.json();
}

export default function AdminAlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAlerts()
      .then(data => {
        setAlerts(data.alerts || []);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  // Obtener los IDs únicos de usuario de las alertas
  const userIds = Array.from(new Set(alerts.map(a => a.user_id)));
  const usernames = useUsernames(userIds);

  return (
    <section className="mx-auto max-w-3xl space-y-8 text-text">
      <div className="rounded-2xl border border-red-200 bg-white shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-red-100 text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </span>
          <div>
            <h2 className="text-2xl font-bold text-red-700">Alertas de riesgo</h2>
            <p className="text-sm text-text/70">Mensajes detectados con posible riesgo emocional o bullying.</p>
          </div>
        </div>
        {loading && <div className="text-gray-500">Cargando alertas...</div>}
        {error && <div className="text-red-500">{error}</div>}
        <ul className="space-y-5">
          {alerts.length === 0 && !loading && (
            <li className="col-span-2 text-center text-text/60 py-8">No hay alertas registradas.</li>
          )}
          {alerts.map((alert, i) => (
            <li key={i} className="rounded-xl border border-red-100 bg-red-50 p-5 shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-200 text-red-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
                <span className="font-semibold text-base text-red-800 truncate" title={alert.user_id}>
                  Usuario: {usernames[alert.user_id] || alert.user_id}
                </span>
              </div>
              <div className="text-sm"><b>Tipo de riesgo:</b> <span className="text-red-700">{alert.risk_type}</span></div>
              <div className="text-sm"><b>Detectado por:</b> {alert.score > 0 ? 'Palabra clave o emoción' : 'Automático'}</div>
              <div className="text-sm"><b>Fecha:</b> {new Date(alert.timestamp).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
