// API para enviar alerta de riesgo al backend
export async function sendRiskAlert({ userId, score, riskType, timestamp }: { userId: string, score: number, riskType: string, timestamp: string }) {
  const apiUrl = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:8787';
  const res = await fetch(`${apiUrl}/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, score, riskType, timestamp })
  });
  if (!res.ok) throw new Error('Error enviando alerta');
  return await res.json();
}
