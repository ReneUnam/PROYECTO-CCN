import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Button } from '@/components/ui/button';
import { updateMaterial } from '../api/materialsApi';

export function EditMaterialModal({
  open,
  onClose,
  onUpdated,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  initial: { id: string; title: string; description?: string | null } | null;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title ?? '');
      setDescription(initial.description ?? '');
      setPdfFile(null);
      setThumbFile(null);
      setError(null);
    }
  }, [initial, open]);

  if (!open || !initial || typeof window === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Ingresa un título.');
      return;
    }

    setSubmitting(true);
    try {
      await updateMaterial({
        id: initial.id,
        title: title.trim(),
        description: description.trim() || null,
        pdfFile: pdfFile ?? undefined,
        thumbnailFile: thumbFile ?? undefined,
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo actualizar el material');
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-w-lg w-full rounded-lg bg-[color:var(--color-surface)] p-5 shadow-lg max-h-[90vh] overflow-auto border border-[color:var(--color-border)]">
        <h3 className="text-lg font-semibold mb-3">Editar material</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Título</label>
            <input
              className="w-full rounded-md border border-border px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre del recurso"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              className="w-full rounded-md border border-border px-3 py-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="text-sm text-gray-600">Archivos (opcional): si cargas uno nuevo, reemplazará el actual.</div>
          <div>
            <label className="block text-sm font-medium mb-1">Nuevo PDF (opcional)</label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center px-3 py-2 rounded-md bg-[color:var(--color-primary)] text-white cursor-pointer hover:brightness-105">
                Seleccionar PDF
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <span className="text-sm text-gray-600 truncate max-w-[60%]">
                {pdfFile ? pdfFile.name : 'Ningún archivo seleccionado'}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nueva miniatura (opcional)</label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center px-3 py-2 rounded-md bg-[color:var(--color-primary)] text-white cursor-pointer hover:brightness-105">
                Seleccionar imagen
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <span className="text-sm text-gray-600 truncate max-w-[60%]">
                {thumbFile ? thumbFile.name : 'Ningún archivo seleccionado'}
              </span>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={onClose} variant="ghost">Cancelar</Button>
            <Button type="submit" disabled={submitting} variant="primary" className="bg-[color:var(--color-secondary)] text-white">
              {submitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
}
