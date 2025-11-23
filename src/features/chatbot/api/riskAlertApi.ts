// API para enviar alerta de riesgo al backend
export async function sendRiskAlert({ userId, score, riskType, timestamp }: { userId: string, score: number, riskType: string, timestamp: string }) {
  const res = await fetch('/alerts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, score, riskType, timestamp })
  });
  if (!res.ok) throw new Error('Error enviando alerta');
  return await res.json();
}
