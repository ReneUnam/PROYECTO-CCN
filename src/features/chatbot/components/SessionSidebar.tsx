import { useEffect, useState } from 'react';
import { supabase } from '@/core/api/supabaseClient';
import { listUserSessionsServer } from '../api/chatApi';

interface Session {
  id: string;
  created_at: string;
  summary?: string | null;
  dominant_emotion?: string | null;
  message_count?: number;
}

interface Props {
  userId: string;
  currentSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export default function SessionSidebar({ userId, currentSessionId, onSelect, onNew, isMobile, onClose }: Props) {
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

  function timeAgo(iso: string) {
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    const s = Math.floor(diff / 1000);
    if (s < 5) return 'justo ahora';
    if (s < 60) return `hace ${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `hace ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h}h`;
    const d = Math.floor(h / 24);
    return `hace ${d}d`;
  }

  function deriveTitle(s: Session) {
    // Si hay topic, usarlo como título principal
    if ((s as any).topic && typeof (s as any).topic === 'string' && (s as any).topic.trim()) {
      const topic = (s as any).topic.trim();
      return topic.length > 50 ? topic.slice(0, 50) + '…' : topic;
    }
    // Si hay resumen, usar la primera frase
    if (s.summary && typeof s.summary === 'string' && s.summary.trim()) {
      const first = s.summary.split(/[.!?]/)[0].trim();
      if (first) return first.length > 50 ? first.slice(0, 50) + '…' : first;
    }
    // Si no hay resumen, usar la primera frase del primer mensaje de usuario si existe
    if ((s as any).first_message && typeof (s as any).first_message === 'string' && (s as any).first_message.trim()) {
      const first = (s as any).first_message.split(/[.!?]/)[0].trim();
      if (first) return first.length > 50 ? first.slice(0, 50) + '…' : first;
    }
    // Como último recurso, mostrar solo "Conversación" y la fecha
    return 'Conversación ' + new Date(s.created_at).toLocaleDateString();
  }

  function emotionStyle(emotion: string) {
    const e = emotion.toLowerCase();
    const map: Record<string, { bg: string; fg: string; border: string }> = {
      'alegría': { bg: '#fef3c7', fg: '#92400e', border: '#fcd34d' },
      'tristeza': { bg: '#e0f2fe', fg: '#0c4a6e', border: '#38bdf8' },
      'ira': { bg: '#fee2e2', fg: '#991b1b', border: '#f87171' },
      'miedo': { bg: '#ede9fe', fg: '#5b21b6', border: '#c4b5fd' },
      'amor': { bg: '#ffe4e6', fg: '#9f1239', border: '#fb7185' },
      'sorpresa': { bg: '#f3e8ff', fg: '#6b21a8', border: '#d8b4fe' },
      'neutral': { bg: '#f3f4f6', fg: '#374151', border: '#d1d5db' }
    };
    const st = map[e] || map['neutral'];
    return { backgroundColor: st.bg, color: st.fg, borderColor: st.border };
  }

  return (
    <aside className={`bg-surface p-6 flex flex-col gap-5 shadow-lg font-sans rounded-xl border border-border ${isMobile ? 'w-full h-full overflow-auto rounded-none' : 'w-80'}`}>
      {isMobile && (
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold text-text">Tus sesiones</div>
          <button onClick={() => onClose?.()} aria-label="Cerrar" className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-text">Cerrar</button>
        </div>
      )}
      <button
        onClick={onNew}
        className="mb-3 px-4 py-2 rounded-lg bg-primary hover:bg-primary/80 text-white text-base font-semibold shadow-md transition animate-popIn"
      >+ Nueva conversación</button>
      {!isMobile && <div className="font-semibold text-text mb-3 text-lg">Tus sesiones</div>}
      {loading ? <div className="text-sm text-text/70">Cargando...</div> : null}
      <ul className="flex-1 overflow-auto space-y-3">
        {sessions.map(s => {
          const active = s.id === currentSessionId;
          const title = deriveTitle(s);
          return (
            <li key={s.id}>
              <button
                onClick={() => onSelect(s.id)}
                data-id={s.id}
                aria-pressed={active}
                title={title}
                className={`group w-full text-left rounded-2xl px-4 py-3 border flex items-center gap-3 shadow-md transition focus:outline-none focus:ring-2 focus:ring-primary font-sans
                  ${active ? 'border-primary bg-surface shadow-lg' : 'border-transparent bg-surface/80 hover:bg-primary/10'}`}
              >
                <span className="text-base font-semibold text-text truncate" title={title}>{title}</span>
                {s.dominant_emotion && (
                  <span
                    className="text-[11px] px-3 py-[3px] rounded-full border font-semibold shadow-sm"
                    style={emotionStyle(s.dominant_emotion)}
                    title={`Emoción dominante: ${s.dominant_emotion}`}
                  >{s.dominant_emotion}</span>
                )}
              </button>
            </li>
          );
        })}
        {sessions.length === 0 && !loading ? <li className="text-sm text-text/70">No tienes sesiones previas.</li> : null}
      </ul>
    </aside>
  );
}
