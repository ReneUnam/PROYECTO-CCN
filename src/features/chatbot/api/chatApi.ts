import { supabase } from '@/core/api/supabaseClient';

export type ChatRole = 'user' | 'assistant' | 'system';
export interface ChatMessage {
  role: ChatRole;
  content: string;
  emotion?: string | null;
  emotionScores?: Record<string, number> | null;
  created_at?: string;
}

export interface SendMessageOptions {
  sessionId?: string | null;
  messages: ChatMessage[]; // incluye el histórico + nuevo mensaje al final
  userId: string; // profiles.id del usuario autenticado
}

// Enviar mensaje y recibir stream de respuesta + emoción
const CHAT_BASE = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:8787';

export interface SendChatResponse {
  full: string;
  sessionId: string;
  emotion?: string;
  emotionScores?: Record<string, number>;
}

export async function sendChat(
  options: SendMessageOptions,
  onToken: (token: string) => void
): Promise<SendChatResponse> {
  const { sessionId, messages, userId } = options;
  const res = await fetch(`${CHAT_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify({ sessionId, messages })
  });
  if (!res.ok || !res.body) throw new Error('Fallo en endpoint /chat');

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let full = '';
  let meta: any = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split(/\r?\n/)) {
      if (!line) continue;
      if (!line.startsWith('data:')) continue;
      const payloadStr = line.slice(5).trim();
      if (payloadStr === '[END]') continue;
      try {
        const obj = JSON.parse(payloadStr);
        if (obj.type === 'token') {
          onToken(obj.token);
          full += obj.token;
        } else if (obj.type === 'meta') {
          meta = obj;
        }
      } catch (_) {
        // ignorar líneas mal formateadas
      }
    }
  }

  return {
    full,
    sessionId: meta?.sessionId || sessionId || '',
    emotion: meta?.emotion,
    emotionScores: meta?.emotionScores
  };
}

export async function listSessionMessages(sessionId: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, emotion, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Obtener historial vía servicio backend (usa service role y verifica propiedad)
export async function listSessionMessagesServer(sessionId: string, userId: string) {
  const res = await fetch(`${CHAT_BASE}/chat/${sessionId}/messages`, {
    headers: { 'x-user-id': userId }
  });
  if (!res.ok) throw new Error('Error obteniendo historial servidor');
  const json = await res.json();
  return json;
}

// Listar sesiones del usuario vía backend
export async function listUserSessionsServer(userId: string) {
  const res = await fetch(`${CHAT_BASE}/chat/sessions`, { headers: { 'x-user-id': userId } });
  if (!res.ok) throw new Error('Error obteniendo sesiones servidor');
  return res.json();
}
