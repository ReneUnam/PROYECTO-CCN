import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createSuggestion, listMySuggestions } from '../api/mailboxApi';

type SuggestionRow = {
  id: string;
  subject: string;
  message: string;
  category?: string | null;
  created_at: string;
  attachments?: Array<{ name: string; path: string }>|null;
};

export default function MailboxPage() {
  const { user, loading } = useAuth();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const roleId = user?.role_id ?? 3;

  async function refresh() {
    try {
      const data = await listMySuggestions();
      setRows(data as any);
    } catch (_) {
      setRows([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  if (loading) return <div className="p-6">Cargando…</div>;

  const canSend = user && (roleId === 2 || roleId === 3);

  return (
    <section className="mx-auto max-w-3xl p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Buzón</h1>
        <p className="text-sm text-gray-600">Envía una sugerencia o comentario. Solo el administrador puede leer todos los envíos.</p>
      </header>

      {/* Formulario */}
      <form
        className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!user) return;
          if (!canSend) {
            alert('Tu rol no puede enviar sugerencias.');
            return;
          }
          setSubmitting(true);
          try {
            await createSuggestion({
              author_profile_id: user.id,
              role_id: roleId as any,
              subject: subject.trim(),
              message: message.trim(),
              category: category.trim() || null,
              files,
            });
            setSubject('');
            setCategory('');
            setMessage('');
            setFiles([]);
            await refresh();
          } catch (err: any) {
            alert(err?.message ?? 'No se pudo enviar');
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div className="space-y-1">
          <label className="text-sm">Asunto</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="Asunto" />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Categoría (opcional)</label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Sugerencia, Técnica, Otro…" />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Mensaje</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            className="min-h-[120px] w-full rounded-md border border-border bg-transparent p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Escribe tu mensaje"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Adjuntos (opcional)</label>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 && (
            <p className="text-xs text-gray-600">{files.length} archivo(s) seleccionados</p>
          )}
        </div>

        <Button type="submit" disabled={submitting || !canSend}>
          {submitting ? 'Enviando…' : 'Enviar sugerencia'}
        </Button>
      </form>

      {/* Mis sugerencias */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mis envíos</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-600">Aún no has enviado sugerencias.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{r.subject}</h3>
                  <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {r.category && <p className="text-xs text-gray-600 mt-1">Categoría: {r.category}</p>}
                <p className="mt-2 text-sm whitespace-pre-wrap">{r.message}</p>
                {Array.isArray(r.attachments) && r.attachments.length > 0 && (
                  <ul className="mt-2 list-disc pl-4 text-sm">
                    {r.attachments.map((a, idx) => (
                      <li key={idx}>{a.name}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
