// Streaming contra Ollama local
// Requiere tener el daemon Ollama corriendo y modelo descargado
const DEFAULT_MODEL = (process.env.OLLAMA_MODEL || 'llama2:7b-chat').trim();

function buildPrompt(messages) {
  // Limitar a los últimos 5 mensajes
  const limited = messages.slice(-5);
  return limited.map(m => {
    if (m.role === 'system') return `Instrucciones: ${m.content}`;
    if (m.role === 'user') return `Usuario: ${m.content}`;
    return `Asistente: ${m.content}`;
  }).join('\n') + '\nAsistente:';
}

export async function streamLLM(messages, onToken) {
  const prompt = buildPrompt(messages);
  const body = {
    model: DEFAULT_MODEL,
    prompt,
    stream: true,
    options: {
      temperature: 0.3, // Directo
      num_ctx: 2048,
      num_predict: 400, // Respuestas más largas
      top_p: 0.9 // Menos divagación
    }
  };

  // Log para depuración
  console.log('[OLLAMA] Modelo:', body.model);
  console.log('[OLLAMA] Body:', JSON.stringify(body));

  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok || !res.body) {
    console.error('[OLLAMA] Error status:', res.status);
    throw new Error(`Ollama fallo: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let full = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.response) {
          // Log de depuración para ver tokens reales del modelo
          let clean = obj.response;
          if (clean.startsWith('Asistente:')) {
            clean = clean.replace(/^Asistente:\s*/, '');
          }
          console.log('[llm-token]', JSON.stringify(clean));
          onToken(clean);
          full += clean;
        }
      } catch (_) {
        /* ignorar */
      }
    }
  }
  return full.trim();
}
