import { useEffect, useState } from 'react';
import { supabase } from '@/core/api/supabaseClient';
import { listUserSessionsServer } from '../api/chatApi';

interface Session {
  id: string;
  created_at: string;
  summary?: string | null;
}

interface Props {
  userId: string;
  currentSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export default function SessionSidebar({ userId, currentSessionId, onSelect, onNew }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    // Primero intento vía supabase cliente
    supabase
      .from('chat_sessions')
      .select('id, created_at, summary')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        if (cancelled) return;
        const clientCount = data?.length || 0;
        console.log(`[sessions] cliente obtuvo ${clientCount}`);
        // Si cliente falla (0) probamos backend (service role)
        if (!clientCount) {
          try {
            const srv = await listUserSessionsServer(userId);
            if (!cancelled) {
              console.log(`[sessions] servidor obtuvo ${srv.sessions?.length || 0}`);
              setSessions(srv.sessions || []);
            }
          } catch (e) {
            console.warn('[sessions] error backend', (e as any).message);
            setSessions([]);
          }
        } else {
          setSessions(data || []);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId, currentSessionId]);

  return (
    <aside className="w-72 border-r bg-gray-50 p-4 flex flex-col gap-4">
      <button onClick={onNew} className="mb-2 px-3 py-1 rounded bg-indigo-600 text-white text-sm">+ Nueva conversación</button>
      <div className="font-semibold text-gray-700 mb-2">Tus sesiones</div>
      {loading ? <div>Cargando...</div> : null}
      <ul className="flex-1 overflow-auto space-y-2">
        {sessions.map(s => (
          <li key={s.id}>
            <button
              className={`w-full text-left p-2 rounded border ${s.id === currentSessionId ? 'border-indigo-600 bg-white' : 'border-transparent bg-gray-100'} hover:bg-indigo-50`}
              onClick={() => onSelect(s.id)}
            >
              <div className="text-xs text-gray-500">{new Date(s.created_at).toLocaleString()}</div>
              {s.summary ? (
                <div className="text-[11px] text-gray-700 mt-1"><b>Resumen:</b> {s.summary}</div>
              ) : null}
              <div className="text-xs text-gray-600 mt-1">ID: {s.id.slice(0, 8)}...</div>
            </button>
          </li>
        ))}
        {sessions.length === 0 && !loading ? <li className="text-xs text-gray-400">No tienes sesiones previas.</li> : null}
      </ul>
    </aside>
  );
}
