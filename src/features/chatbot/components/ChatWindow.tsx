import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { sendRiskAlert } from '../api/riskAlertApi';
import { sendChat, listSessionMessagesServer } from '../api/chatApi';
import type { ChatMessage } from '../api/chatApi';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface ChatWindowProps {
  initialSystemPrompt?: string;
}

import SessionSidebar from './SessionSidebar';

export default function ChatWindow({ initialSystemPrompt = 'Eres un asistente académico empático en español. Mantén tono calmado y validación emocional. Responde siempre en español, nunca en inglés, aunque el usuario escriba en otro idioma. Si el usuario pide recomendaciones de asociaciones, instituciones o ayuda, responde solo con opciones de Nicaragua.' }: ChatWindowProps) {
  // ...existing code...
  // ...existing code...
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [scrollDistance, setScrollDistance] = useState(0); // distancia al fondo
  const SCROLL_THRESHOLD = 56; // px para considerar "cerca del final"
  const userInteractedRef = useRef(false); // registra interacción mientras se hace streaming

  const riskKeywords = [
    'bullying', 'acoso', 'acosando', 'acosa', 'acosar',
    'suicidio', 'suicida', 'suicidarse',
    'miedo', 'miedoso', 'temor',
    'tristeza', 'triste', 'depresión', 'depresivo', 'deprimido',
    'amenaza', 'amenazando', 'amenazar',
    'golpe', 'golpeando', 'golpear', 'golpeado',
    'insulto', 'insultando', 'insultar', 'insultado',
    'abuso', 'abusando', 'abusar', 'abusado',
    'matar', 'matando', 'matarse', 'asesinar', 'asesinato',
    'aborto', 'abortando', 'abortar', 'abortado',
    'drogas', 'alcohol', 'cocaina', 'marihuana', 
    'cigarros', 'tabaco', 'anfetaminas', 'opioides',
    'heroína', 'lsd', 'éxtasis', 'metanfetamina',
    'crack', 'inhalantes', 'alucinógenos',
    'sustancias', 'solventes', 'pastillas',
    'psicotrópicos', 'barbitúricos', 'benzodiacepinas'
  ];
  const riskEmotions = ['tristeza', 'miedo', 'ira'];
  const RISK_SCORE_THRESHOLD = 3;

  function calculateRiskScore(messages: ChatMessage[]): number {
    let score = 0;
    messages.forEach(m => {
      if (m.emotion && riskEmotions.includes(m.emotion.toLowerCase())) score++;
      if (m.content) {
        const contentLower = m.content.toLowerCase();
        riskKeywords.forEach(keyword => {
          if (contentLower.includes(keyword)) score++;
        });
      }
    });
    return score;
  }

  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: initialSystemPrompt }
  ]);
  // ...existing code...

  // Mover la lógica de alerta al envío del mensaje de usuario
  const lastAlertedMsgRef = useRef<string | null>(null);

  async function handleSend() {
    if (!input.trim() || streaming) return;
    const nowIso = new Date().toISOString();
    const newUserMsg: ChatMessage = { role: 'user', content: input.trim(), created_at: nowIso };
    const nextHistory = [...messages, newUserMsg];

    // --- ALERTA DE RIESGO SOLO AL ENVIAR MENSAJE DE USUARIO ---
    if (user?.id && lastAlertedMsgRef.current !== newUserMsg.content) {
      const riskScore = calculateRiskScore([newUserMsg]);
      let hasKeyword = false;
      let riskType: string = '';
      for (const keyword of riskKeywords) {
        if (newUserMsg.content && newUserMsg.content.toLowerCase().includes(keyword)) {
          hasKeyword = true;
          riskType = keyword;
          break;
        }
      }
      if ((riskScore >= RISK_SCORE_THRESHOLD || hasKeyword)) {
        lastAlertedMsgRef.current = newUserMsg.content;
        console.log('[ALERTA RIESGO] user.id que se envía:', user.id);
        if (!riskType && typeof newUserMsg.emotion === 'string') {
          riskType = newUserMsg.emotion || '';
        }
        sendRiskAlert({
          userId: user.id,
          score: riskScore,
          riskType,
          timestamp: nowIso
        }).then(() => {
          console.warn('[ALERTA RIESGO] Enviada al backend para el usuario:', user.id, 'Score:', riskScore, 'Tipo:', riskType);
        }).catch(e => {
          console.error('[ALERTA RIESGO] Error enviando alerta:', e.message);
        });
      }
    }
    // --- FIN ALERTA DE RIESGO ---

    setMessages(nextHistory);
    setInput('');
    setStreaming(true);
    // Insertamos placeholder del asistente y guardamos índice para actualizaciones directas
    const assistantIndex = nextHistory.length; // posición donde irá el asistente
    setMessages(curr => [...curr, { role: 'assistant', content: '', created_at: nowIso }]);
    let assistantContent = '';
    try {
      if (!user?.id) {
        setMessages(curr => curr.map((m, i) => i === assistantIndex ? { ...m, content: 'No hay user.id disponible.' } : m));
        setStreaming(false);
        return;
      }
      const result = await sendChat({ sessionId, messages: nextHistory, userId: user.id }, (token) => {
        assistantContent += token;
        // Actualizamos sólo el índice del asistente
        setMessages(curr => curr.map((m, i) => i === assistantIndex ? { ...m, content: assistantContent } : m));
      });
      const newSessionId = result.sessionId || sessionId;
      setSessionId(newSessionId);
      if (newSessionId && newSessionId !== localStorage.getItem('chat_session_id')) {
        localStorage.setItem('chat_session_id', newSessionId);
        console.log('[chat] sessionId creado y guardado', newSessionId);
      }
      setMessages(curr => curr.map((m, i) => i === assistantIndex ? { ...m, content: assistantContent, emotion: result.emotion || null } : m));
    } catch (e: any) {
      setMessages(curr => curr.map((m, i) => i === assistantIndex ? { ...m, content: e.message || 'Error procesando respuesta.' } : m));
    } finally {
      setStreaming(false);
    }
  }

  // Auto-scroll sólo si el usuario estaba ya al fondo antes de este render
  useLayoutEffect(() => {
    if (!scrollContainerRef.current) return;
    if (!autoScroll) return; // desactivado manualmente
    const el = scrollContainerRef.current;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance < SCROLL_THRESHOLD) {
      // usar scroll rápido mientras llega cada token para no pelear con gestos del usuario
      endRef.current?.scrollIntoView({ behavior: streaming ? 'auto' : 'smooth' });
    }
  }, [messages, autoScroll, streaming]);

  // Evento de scroll para detectar si el usuario se aleja del final
  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setScrollDistance(distanceFromBottom);
    // Si el usuario se aleja más que el umbral, desactivar de inmediato
    if (distanceFromBottom >= SCROLL_THRESHOLD) {
      if (autoScroll) setAutoScroll(false);
      userInteractedRef.current = true;
    } else {
      // Cerca del final: solo reactivar si no hubo interacción manual durante streaming
      if (!userInteractedRef.current && !autoScroll) setAutoScroll(true);
    }
  }

  // Marcar interacción al usar rueda / mousedown
  function registerUserInteraction() {
    userInteractedRef.current = true;
    if (autoScroll) setAutoScroll(false);
  }

  function scrollToBottom() {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScroll(true);
  }

  function emotionColor(emotion?: string | null) {
    const base = { bg: '#f3f4f6', fg: '#374151', border: '#e5e7eb' };
    if (!emotion) return base;
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
    return map[e] || base;
  }

  function emotionIcon(emotion?: string | null) {
    if (!emotion) return '💬';
    const e = emotion.toLowerCase();
    const map: Record<string, string> = {
      'alegría': '🙂',
      'tristeza': '😢',
      'ira': '😠',
      'miedo': '😰',
      'amor': '❤️',
      'sorpresa': '😮',
      'neutral': '😐'
    };
    return map[e] || '💬';
  }

  function timeAgo(iso?: string) {
    if (!iso) return '';
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 5) return 'justo ahora';
    if (sec < 60) return `hace ${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `hace ${min}m`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days}d`;
  }

  // Restaurar sessionId solamente (sin cargar aún) al montar
  useEffect(() => {
    const stored = localStorage.getItem('chat_session_id');
    if (stored) {
      setSessionId(stored);
      console.log('[chat] sessionId restaurado', stored);
    }
  }, []);

  // Cargar historial cuando tengamos sessionId y usuario autenticado (RLS depende de auth.uid())
  useEffect(() => {
    if (!sessionId || !user?.id) return;
    // Evitar recargas múltiples: si ya hay más de 1 mensaje (system + alguno) no recargar
    if (messages.length > 1) return;
    let cancelled = false;

    async function loadHistory(attempt = 0) {
      try {
        const result = await listSessionMessagesServer(sessionId!, user!.id);
        if (cancelled) return;
        const dbMsgs = result.messages || [];
        if (!dbMsgs.length && attempt < 2) {
          // Puede que el token de auth aún no haya aplicado RLS; reintentar
            setTimeout(() => loadHistory(attempt + 1), 800);
            return;
        }
        const mapped: ChatMessage[] = dbMsgs.map((m: any) => ({ role: m.role as any, content: m.content, emotion: m.emotion || null, created_at: m.created_at }));
        setMessages(prev => {
          const baseSystem = prev.find(m => m.role === 'system');
          return baseSystem ? [baseSystem, ...mapped] : mapped;
        });
        console.log(`[chat] historial cargado servidor (${mapped.length} mensajes)`);
      } catch (e: any) {
        console.warn('[chat] error cargando historial', e.message);
      }
    }
    loadHistory();
    return () => { cancelled = true; };
  }, [sessionId, user?.id, messages.length]);

  // ...eliminada función duplicada handleSend...

  // Nueva conversación: borra sessionId y reinicia mensajes
  function startNewSession() {
    localStorage.removeItem('chat_session_id');
    setSessionId(null);
    setMessages([
      { role: 'system', content: initialSystemPrompt },
      { role: 'assistant', content: '¡Hola! ¡Bienvenido a nuestro servicio de apoyo académico! Me alegra que hayas decidido conectarte con nosotros. ¿En qué puedo ayudarte hoy? ¿Tienes algún problema o inquietud que te gustaría discutir? Estoy aquí para escucharte y apoyarte en lo que necesites. Recuerda que tu privacidad es importante para mí, así que no tengas temor a compartir tus pensamientos o sentimientos conmigo. ¡Estoy aquí para ti!' }
    ]);
  }

  // Seleccionar sesión previa
  function selectSession(id: string) {
    localStorage.setItem('chat_session_id', id);
    setSessionId(id);
    setMessages([{ role: 'system', content: initialSystemPrompt }]);
  }

  const [showSessionDrawer, setShowSessionDrawer] = useState(false);

  return (
    <div className="flex h-full font-sans gap-4 flex-col md:flex-row bg-[color:var(--color-surface)] text-[color:var(--color-text)] transition-colors duration-300">
      {/* Mobile drawer for sessions */}
      {user?.id && (
        <>


          {/* Sidebar inline on md+ */}
          <div className="hidden md:block">
            <SessionSidebar
              userId={user.id}
              currentSessionId={sessionId}
              onSelect={selectSession}
              onNew={startNewSession}
            />
          </div>

          {/* Drawer overlay on small screens*/}
          {showSessionDrawer && (
            <div className="fixed inset-x-0 top-16 bottom-0 z-50 md:hidden"> {/* avoid covering global header (h-16) */}
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowSessionDrawer(false)} />
              <div id="session-drawer" className="absolute left-0 top-0 bottom-0 w-11/12 w-140 p-4">
                <div className="bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-xl h-full shadow-lg p-4 overflow-y-auto backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-[color:var(--color-text)]">Sesiones</div>
                    <button className="p-1 rounded-lg hover:bg-[color:var(--color-hover)]" onClick={() => setShowSessionDrawer(false)} aria-label="Cerrar">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <SessionSidebar
                    userId={user.id}
                    currentSessionId={sessionId}
                    onSelect={(id) => { selectSession(id); setShowSessionDrawer(false); }}
                    onNew={() => { startNewSession(); setShowSessionDrawer(false); }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <div className="flex flex-col flex-1 h-full max-h-[80vh] md:max-h-[88vh] rounded-xl bg-[color:var(--color-surface)] shadow-lg border border-[color:var(--color-border)]">
        {/* Mobile header: show small bar with toggle */}
        <div className="w-full md:hidden p-3 border-b border-[color:var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSessionDrawer(true)} className="p-2 rounded-md hover:bg-[color:var(--color-hover)]">
              <Menu className="h-5 w-5" />
            </button>
            <div className="font-semibold text-[color:var(--color-text)]">Asistente virtual</div>
          </div>
          <div className="text-sm text-[color:var(--color-text)]/80">Blue</div>
        </div>
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto p-6 space-y-4 text-base relative bg-gradient-to-b from-[color:var(--bg-start)] to-[color:var(--bg-end)]"
          onWheel={registerUserInteraction}
          onMouseDown={registerUserInteraction}
          onTouchStart={registerUserInteraction}
        >
          {!autoScroll && scrollDistance > 120 && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="absolute right-6 bottom-6 z-10 px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-full shadow-lg animate-popIn flex items-center gap-1"
              aria-label="Ir al final"
            >⬇ Ir al final</button>
          )}
          {messages.filter(m => m.role !== 'system').map((m, i) => {
            const isUser = m.role === 'user';
            const badgeColor = emotionColor(m.emotion);
            const icon = emotionIcon(m.emotion);
            return (
              <div
                key={i}
                className={`group mb-3 px-4 py-3 rounded-2xl whitespace-pre-wrap transition shadow-md hover:shadow-lg max-w-[92%] sm:max-w-[80%] ${isUser ? 'bg-[color:var(--user-bubble-bg)] text-[color:var(--user-bubble-text)] self-end ml-auto' : 'bg-[color:var(--color-surface)] text-[color:var(--color-text)] border border-[color:var(--color-border)]'} animate-fadeIn`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <div className="text-xs font-semibold mb-1 flex items-center gap-2 justify-between">
                  <span className={`flex items-center gap-1 ${isUser ? 'text-[color:var(--user-bubble-text)]' : 'text-[color:var(--color-primary)]'}`}>
                    {isUser
                      ? (user?.role_id === 2 ? 'Docente' : 'Tú')
                      : <><img src="/blue-avatar.jpg" alt="Blue" className="inline-block w-7 h-7 rounded-full mr-2 align-middle animate-popIn shadow-lg" style={{boxShadow: '0 0 12px 2px #60a5fa'}} />Blue</>}
                  </span>
                  {m.created_at && (
                    <span className="text-[10px] text-gray-400" title={new Date(m.created_at).toLocaleString()}>{timeAgo(m.created_at)}</span>
                  )}
                </div>
                <div className={`text-[15px] md:text-base leading-relaxed ${isUser ? 'text-[color:var(--user-bubble-text)]' : 'text-[color:var(--color-text)]'}`}>{m.content || (streaming && m.role === 'assistant' ? '...' : '')}</div>
                {m.emotion && (
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] dark:text-gray-300" aria-label={`Emoción detectada: ${m.emotion}`}>
                    <span className="uppercase text-gray-500">Emoción:</span>
                    <span
                      title="Clasificación automática (puede contener errores)"
                      className="px-2 py-[3px] rounded-full border flex items-center gap-1"
                      style={{
                        backgroundColor: badgeColor.bg,
                        color: badgeColor.fg,
                        borderColor: badgeColor.border,
                        fontWeight: 500
                      }}
                    >{icon} {m.emotion}</span>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-4 border-t border-[color:var(--color-border)] flex gap-3 bg-[color:var(--color-surface)] sticky bottom-0 z-10 md:static">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 rounded-lg border border-[color:var(--color-border)] px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-[color:var(--color-surface)] shadow-sm text-[color:var(--color-text)]"
            disabled={streaming}
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
          <button className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-base font-semibold shadow-md hover:bg-indigo-500 transition disabled:opacity-50 dark:bg-indigo-700 dark:hover:bg-indigo-600" disabled={streaming}>Enviar</button>
        </form>
      </div>
    </div>
  );
}
