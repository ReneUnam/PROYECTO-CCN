import { supabaseAdmin } from './supabase.js';

// Resumen y compactación de conversaciones.
// Usa modelo Ollama para generar un resumen corto y luego elimina mensajes antiguos.

const MODEL = process.env.OLLAMA_MODEL || 'llama3:8b';
const ENABLE = (process.env.ENABLE_CHAT_SUMMARY || 'false').toLowerCase() === 'true';
const THRESHOLD = parseInt(process.env.CHAT_SUMMARY_THRESHOLD || '3', 10); // número de mensajes totales para disparar
const KEEP_RECENT = parseInt(process.env.CHAT_SUMMARY_KEEP_RECENT || '6', 10); // cuantos mensajes recientes conservar después de compactar

async function generateSummary(allMessages) {
  // Construimos diálogo plano sin mensajes system previos (los mantenemos fuera del resumen)
  const dialogue = allMessages
    .filter(m => m.role !== 'system')
    .map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
    .join('\n');
  const prompt = `Identifica el tema principal de la siguiente conversación académica y devuélvelo en máximo 6 palabras. Devuelve solo el tema, sin comentarios meta ni resumen.\n\n${dialogue}\n\nTema:`;

  const body = { model: MODEL, prompt, stream: false, options: { temperature: 0.4, num_ctx: 2048, num_predict: 64 } };
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Ollama topic fallo: ${res.status}`);
  const json = await res.json();
  return (json.response || '').trim();
}

export async function maybeCompactSession(sessionId) {
  if (!ENABLE) return { skipped: true };
  // Obtener mensajes de la sesión ordenados
  const { data: msgs, error } = await supabaseAdmin
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[summary] error fetch mensajes', error.message);
    return { error: error.message };
  }
  if (!msgs || msgs.length < THRESHOLD) return { skipped: true };

  // Generar resumen de todos menos los recientes
  const cutoffIndex = Math.max(0, msgs.length - KEEP_RECENT);
  const toSummarize = msgs.slice(0, cutoffIndex);
  const toKeep = msgs.slice(cutoffIndex); // estos permanecen
  let topic = '';
  try {
    topic = await generateSummary(toSummarize);
  } catch (e) {
    console.error('[summary] fallo generando topic', e.message);
    return { error: e.message };
  }

  // Actualizar tabla chat_sessions solo con topic si columna existe
  try {
    await supabaseAdmin.from('chat_sessions').update({ topic, last_summary_at: new Date().toISOString() }).eq('id', sessionId);
  } catch (e) {
    console.warn('[summary] no se pudo actualizar topic en chat_sessions (columna ausente?)', e.message);
  }

  // Eliminar mensajes antiguos
  const oldIds = toSummarize.map(m => m.id);
  if (oldIds.length) {
    const { error: delErr } = await supabaseAdmin.from('chat_messages').delete().in('id', oldIds);
    if (delErr) console.warn('[summary] error eliminando antiguos', delErr.message);
  }

  // No insertar mensaje system de resumen

  return { summarized: true, removed: oldIds.length };
}
