import { useEffect, useState } from 'react';
import { adminListSuggestions } from '../api/mailboxApi';

type Row = {
  id: string;
  subject: string;
  message: string;
  category?: string | null;
  role_id: number;
  created_at: string;
  attachments?: any[] | null;
  sender_full_name?: string;
};

export default function AdminMailboxPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await adminListSuggestions();
        setRows(data as any);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <section className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="mb-2">
        <h1 className="text-2xl font-bold">Buzón (Admin)</h1>
        <p className="text-sm text-gray-600">Listado de sugerencias enviadas por docentes y estudiantes.</p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-600">No hay sugerencias.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rows.map((r) => (
            <article key={r.id} className="rounded-md border border-border bg-surface p-4 shadow">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{r.subject}</h3>
                <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Remitente: {r.sender_full_name ?? 'Desconocido'}</p>
              {r.category && <p className="text-xs text-gray-600 mt-1">Categoría: {r.category}</p>}
              <p className="mt-2 text-sm whitespace-pre-wrap">{r.message}</p>
              {Array.isArray(r.attachments) && r.attachments.length > 0 && (
                <ul className="mt-2 list-disc pl-4 text-sm">
                  {r.attachments.map((a: any, idx: number) => (
                    <li key={idx}>{a.name}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-gray-500">Rol remitente: {r.role_id === 2 ? 'Docente' : r.role_id === 3 ? 'Estudiante' : String(r.role_id)}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
