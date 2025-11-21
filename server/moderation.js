// Moderación muy básica por palabras clave
const CRISIS_KEYWORDS = [
  'suicidio', 'autolesion', 'matarme', 'quitarme la vida', 'abusar', 'violencia extrema'
];

export function checkModeration(text) {
  const lower = text.toLowerCase();
  const flagged = CRISIS_KEYWORDS.some(k => lower.includes(k));
  return { flagged };
}

export function crisisSafeResponse() {
  return 'Siento que estés pasando por un momento difícil. No puedo brindar ayuda clínica, pero te recomiendo hablar con un profesional o una línea de ayuda inmediata. ¿Puedo ayudarte con recursos académicos mientras tanto?';
}
