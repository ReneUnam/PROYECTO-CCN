// Stub de clasificación de emociones. Sustituir por Hugging Face después.
// Retorna siempre neutral con scores dummy.
// Clasificación real de emociones usando Hugging Face Inference API
// Fallback a neutral si no hay token, error o formato inesperado.

const PRIMARY_MODEL = process.env.HF_EMOTION_MODEL || 'jvanz/bert-base-spanish-emotion';
const SECONDARY_MODEL = process.env.HF_SECONDARY_MODEL || 'mrm8488/t5-base-finetuned-emotion-spanish';
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
const TIMEOUT_MS = parseInt(process.env.HF_EMOTION_TIMEOUT_MS || '8000', 10);

const memoryCache = new Map(); // texto -> {label, scores}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

async function callHF(model, text, attempt = 0) {
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs: text })
  });
  if ((res.status === 503 || res.status === 409) && attempt < 2) { // modelo cargando u ocupado
    await new Promise(r => setTimeout(r, 1200));
    return callHF(model, text, attempt + 1);
  }
  if (res.status === 410) throw new Error(`HF status 410 (model unavailable: ${model})`);
  if (!res.ok) throw new Error(`HF status ${res.status}`);
  return res.json();
}

export async function classifyEmotion(text) {
  if (!text || !HF_TOKEN) {
    return { label: 'neutral', scores: { neutral: 1.0 } };
  }
  const trimmed = text.trim();
  if (memoryCache.has(trimmed)) return memoryCache.get(trimmed);
  console.log('[emotion] clasificación inicio', { primary: PRIMARY_MODEL, secondary: SECONDARY_MODEL, len: trimmed.length });
  try {
    // Intento con modelo primario (formato array de arrays)
    const primaryJson = await withTimeout(callHF(PRIMARY_MODEL, trimmed), TIMEOUT_MS);
    let arr = Array.isArray(primaryJson) ? primaryJson[0] : null;
    if (Array.isArray(arr) && arr.length) {
      const scores = {};
      let top = arr[0];
      for (const item of arr) {
        scores[item.label] = item.score;
        if (item.score > top.score) top = item;
      }
      const result = { label: top.label, scores };
      memoryCache.set(trimmed, result);
      return result;
    }
    // Fallback secundario (modelos tipo T5 devuelven string o lista simple)
    const secondaryJson = await withTimeout(callHF(SECONDARY_MODEL, trimmed), TIMEOUT_MS);
    let labelCandidate = null;
    if (typeof secondaryJson === 'string') labelCandidate = secondaryJson.trim();
    else if (Array.isArray(secondaryJson)) {
      // A veces devuelve array de objetos o array de strings
      const first = secondaryJson[0];
      if (typeof first === 'string') labelCandidate = first.trim();
      else if (Array.isArray(first)) {
        // similar formato que primario
        const scores = {};
        let top = first[0];
        for (const item of first) {
          scores[item.label] = item.score;
          if (item.score > top.score) top = item;
        }
        const result = { label: top.label, scores };
        memoryCache.set(trimmed, result);
        return result;
      } else if (first && first.label) {
        labelCandidate = first.label;
      }
    }
    if (labelCandidate) {
      const result = { label: labelCandidate.toLowerCase(), scores: { [labelCandidate.toLowerCase()]: 0.9 } };
      memoryCache.set(trimmed, result);
      return result;
    }
    return { label: 'neutral', scores: { neutral: 0.9 } };
  } catch (e) {
    console.warn('[emotion] fallo modelo primario', e.message);
    // Intentar modelo secundario si el error proviene del primario
    try {
      const secondaryJson = await withTimeout(callHF(SECONDARY_MODEL, trimmed), TIMEOUT_MS);
      let labelCandidate = null;
      if (typeof secondaryJson === 'string') labelCandidate = secondaryJson.trim();
      else if (Array.isArray(secondaryJson)) {
        const first = secondaryJson[0];
        if (typeof first === 'string') labelCandidate = first.trim();
        else if (Array.isArray(first)) {
          const scores = {};
          let top = first[0];
            for (const item of first) {
              scores[item.label] = item.score;
              if (item.score > top.score) top = item;
            }
            const result = { label: top.label, scores };
            memoryCache.set(trimmed, result);
            return result;
        } else if (first && first.label) labelCandidate = first.label;
      } else if (secondaryJson && secondaryJson.label) labelCandidate = secondaryJson.label;
      if (labelCandidate) {
        const normalized = normalizeLabel(labelCandidate);
        const result = { label: normalized, scores: { [normalized]: 0.9 } };
        memoryCache.set(trimmed, result);
        return result;
      }
      return { label: 'neutral', scores: { neutral: 0.85 } };
    } catch (e2) {
      console.warn('[emotion] fallo también modelo secundario', e2.message);
      // Heurística simple como último recurso
      const heuristic = heuristicEmotion(trimmed);
      memoryCache.set(trimmed, heuristic);
      return heuristic;
    }
  }
}

function normalizeLabel(raw) {
  if (!raw) return 'neutral';
  const lower = raw.toLowerCase().trim();
  const map = {
    alegria: 'alegría',
    "felicidad": 'alegría',
    enojo: 'ira',
    enfado: 'ira',
    rabia: 'ira',
    tristeza: 'tristeza',
    miedo: 'miedo',
    sorpresa: 'sorpresa',
    amor: 'amor',
    calma: 'neutral',
    neutro: 'neutral'
  };
  return map[lower] || lower;
}

function heuristicEmotion(text) {
  const t = text.toLowerCase();
  const buckets = {
    alegria: ['feliz','contento','contenta','alegr','emocionado','entusiasmado','orgulloso','orgullosa','agradecido','agradecida'],
    tristeza: ['triste','deprimido','deprimida','desanimado','desanimada','solo','sola','llor','melancol'],
    ira: ['enojado','enojada','molesto','molesta','frustrado','frustrada','rabia','ira','furios'],
    miedo: ['miedo','temor','ansioso','ansiosa','preocupado','preocupada','nervioso','nerviosa','inseguro','insegura'],
    amor: ['amor','querer','te quiero','te amo','cariño','afecto'],
    sorpresa: ['sorprendido','sorprendida','increíble','wow','no esperaba','impresionante']
  };
  const scores = {};
  for (const [label, words] of Object.entries(buckets)) {
    let count = 0;
    for (const w of words) {
      const re = new RegExp(`\\b${w}`,'g');
      const matches = t.match(re);
      if (matches) count += matches.length;
    }
    if (count) scores[normalizeLabel(label)] = count;
  }
  if (!Object.keys(scores).length) return { label: 'neutral', scores: { neutral: 0.7 } };
  // Determinar mayor
  let topLabel = Object.keys(scores)[0];
  for (const k of Object.keys(scores)) if (scores[k] > scores[topLabel]) topLabel = k;
  // Normalizar a pseudo-probabilidades
  const total = Object.values(scores).reduce((a,b)=>a+b,0);
  const probScores = {};
  for (const k of Object.keys(scores)) probScores[k] = scores[k] / total;
  return { label: topLabel, scores: probScores };
}
