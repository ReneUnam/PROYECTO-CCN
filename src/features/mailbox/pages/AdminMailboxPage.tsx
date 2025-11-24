import { useEffect, useState } from 'react';
import { useToast } from '@/components/toast/ToastProvider';
import { adminListSuggestions, deleteSuggestion } from '../api/mailboxApi';
import { FullScreenLoader } from '@/components/FullScreenLoader';

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
    const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  // Eliminamos vista previa de adjuntos

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

  if (loading) return <FullScreenLoader />;

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
            <article key={r.id} className="rounded-md border border-border bg-surface p-4 shadow relative">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold truncate max-w-[60%]" title={r.subject}>{r.subject}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</span>
                  <button
                    onClick={() => setConfirmId(r.id)}
                    disabled={deletingId === r.id}
                    className="text-xs rounded-md border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === r.id ? 'Borrando…' : 'Eliminar'}
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">Remitente: {r.sender_full_name ?? 'Desconocido'}</p>
              {r.category && <p className="text-xs text-gray-600 mt-1">Categoría: {r.category}</p>}
              <p className="mt-2 text-sm whitespace-pre-wrap">{r.message}</p>
              {/* Adjuntos eliminados del panel de admin */}
              <p className="mt-2 text-xs text-gray-500">Rol remitente: {r.role_id === 2 ? 'Docente' : r.role_id === 3 ? 'Estudiante' : String(r.role_id)}</p>
            </article>
          ))}
        </div>
      )}

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmId(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-5 shadow-lg space-y-4">
            <h2 className="text-lg font-semibold">¿Eliminar sugerencia?</h2>
            <p className="text-sm text-gray-600">Esta acción no se puede deshacer. Se eliminarán también los archivos adjuntos.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmId(null)}
                className="rounded-md border border-border px-3 py-1 text-sm hover:bg-gray-100"
              >Cancelar</button>
              <button
                onClick={async () => {
                  setDeletingId(confirmId);
                  try {
                    await deleteSuggestion(confirmId);
                    setRows(rows.filter(r => r.id !== confirmId));
                  } catch (e: any) {
                    toast.error(e.message || 'Error al eliminar');
                  } finally {
                    setDeletingId(null);
                    setConfirmId(null);
                  }
                }}
                className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                disabled={deletingId === confirmId}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de vista previa eliminado */}
    </section>
  );
}
