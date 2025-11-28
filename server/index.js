import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from './supabase.js';
import { streamLLM } from './llm.js';
import { classifyEmotion } from './classify.js';
import { maybeCompactSession } from './summary.js';
import { checkModeration, crisisSafeResponse } from './moderation.js';
import alertsRouter from './alerts.js';
import usernamesRouter from './usernames.js';

const app = express();
app.use(cors());
app.use(express.json());

// Rutas de alertas
app.use(alertsRouter);
app.use(usernamesRouter);

// SSE helper
function initSSE(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
}
function sendEvent(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n`);
}
function endStream(res) {
  res.write('data: [END]\n');
  res.end();
}

app.post('/chat', async (req, res) => {
  initSSE(res);
  const { sessionId, messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    sendEvent(res, { type: 'error', message: 'No messages provided' });
    return endStream(res);
  }
  // Último mensaje usuario
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUser) {
    sendEvent(res, { type: 'error', message: 'Missing user message' });
    return endStream(res);
  }

  let effectiveSessionId = sessionId;
  const userId = req.headers['x-user-id']; // puedes pasar el perfil id desde frontend tras autenticación
  if (!userId) {
    sendEvent(res, { type: 'error', message: 'Missing x-user-id header' });
    return endStream(res);
  }

  try {
    if (!effectiveSessionId) {
      const { data, error } = await supabaseAdmin
        .from('chat_sessions')
        .insert({ user_id: userId })
        .select('id')
        .single();
      if (error) throw error;
      effectiveSessionId = data.id;
    }

    // Moderación
    const moderation = checkModeration(lastUser.content || '');
    let assistantContent = '';
    if (moderation.flagged) {
      assistantContent = crisisSafeResponse();
      sendEvent(res, { type: 'token', token: assistantContent });
    } else {
      assistantContent = await streamLLM(messages, token => {
        sendEvent(res, { type: 'token', token });
      });
    }

    // Clasificar emociones
    const userEmotion = await classifyEmotion(lastUser.content);
    const assistantEmotion = await classifyEmotion(assistantContent);
    console.log('[emotion] usuario:', userEmotion.label, 'assistant:', assistantEmotion.label);

    // Guardar mensajes (usuario + asistente)
    const userInsert = {
      session_id: effectiveSessionId,
      user_id: userId,
      role: 'user',
      content: lastUser.content,
      emotion: userEmotion.label,
      emotion_scores: userEmotion.scores
    };
    const assistantInsert = {
      session_id: effectiveSessionId,
      user_id: userId,
      role: 'assistant',
      content: assistantContent,
      emotion: assistantEmotion.label,
      emotion_scores: assistantEmotion.scores
    };
    const { error: errUser } = await supabaseAdmin.from('chat_messages').insert(userInsert);
    if (errUser) console.error('Insert usuario error', errUser.message);
    const { error: errAssistant } = await supabaseAdmin.from('chat_messages').insert(assistantInsert);
    if (errAssistant) console.error('Insert asistente error', errAssistant.message);

    sendEvent(res, {
      type: 'meta',
      sessionId: effectiveSessionId,
      emotion: assistantEmotion.label,
      emotionScores: assistantEmotion.scores
    });

    // Intentar compactar si supera umbral (ignora errores silenciosamente)
    try {
      const compactResult = await maybeCompactSession(effectiveSessionId);
      if (compactResult?.summarized) {
        console.log(`[summary] sesión ${effectiveSessionId} compactada, mensajes antiguos removidos:`, compactResult.removed);
      }
    } catch (e) {
      console.warn('[summary] error compactando sesión', e.message);
    }
  } catch (e) {
    console.error(e);
    sendEvent(res, { type: 'error', message: e.message || 'Error interno' });
  } finally {
    endStream(res);
  }
});

// Historial de una sesión (no streaming)
app.get('/chat/:sessionId/messages', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { sessionId } = req.params;
  if (!userId) return res.status(400).json({ error: 'Missing x-user-id header' });
  try {
    // Verificar propiedad de la sesión
    const { data: sessionRow, error: sessErr } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, user_id, summary, last_summary_at')
      .eq('id', sessionId)
      .single();
    if (sessErr) throw sessErr;
    if (!sessionRow || sessionRow.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden session' });
    }
    const { data: msgs, error: msgErr } = await supabaseAdmin
      .from('chat_messages')
      .select('id, role, content, emotion, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (msgErr) throw msgErr;
    console.log(`[chat-history] session ${sessionId} mensajes devueltos: ${msgs?.length || 0}`);
    res.json({ session: sessionRow, messages: msgs || [] });
  } catch (e) {
    console.error('[chat-history] error', e.message);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

// Listado de sesiones del usuario
app.get('/chat/sessions', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(400).json({ error: 'Missing x-user-id header' });
  try {
    const { data: sessions, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, created_at, summary, last_summary_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const enriched = [];
    for (const s of sessions || []) {
      // Obtener mensajes para emoción dominante y primer mensaje
      const { data: msgs, error: msgErr } = await supabaseAdmin
        .from('chat_messages')
        .select('emotion, content, role')
        .eq('session_id', s.id)
        .order('created_at', { ascending: true });
      if (msgErr) {
        console.warn('[chat-sessions] error contando mensajes', msgErr.message);
        enriched.push({ ...s, message_count: 0, dominant_emotion: null, first_message: null });
        continue;
      }
      const counts = {};
      let firstMsg = null;
      for (const m of msgs || []) {
        const label = (m.emotion || 'neutral').toLowerCase();
        counts[label] = (counts[label] || 0) + 1;
        if (!firstMsg && m.role === 'user' && m.content) firstMsg = m.content;
      }
      let dominant = null;
      let max = 0;
      for (const [emo, c] of Object.entries(counts)) {
        // Preferir no-neutral si hay empate
        if (c > max || (c === max && emo !== 'neutral')) {
          dominant = emo;
          max = c;
        }
      }
      enriched.push({ ...s, message_count: msgs?.length || 0, dominant_emotion: dominant, first_message: firstMsg });
    }
    console.log(`[chat-sessions] user ${userId} sesiones: ${enriched.length}`);
    res.json({ sessions: enriched });
  } catch (e) {
    console.error('[chat-sessions] error', e.message);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

const PORT = process.env.CHAT_PORT || 8787;
app.listen(PORT, () => {
  console.log(`[chat-service] escuchando en puerto ${PORT}`);
});
