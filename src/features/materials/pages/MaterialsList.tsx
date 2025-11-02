import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';

type MaterialItem = {
  id: string;
  title: string;
  description?: string;
  file: string; // public path to PDF, relative to /materials/
  thumbnail?: string; // optional thumbnail image path
};

function PreviewModal({ open, url, onClose }: { open: boolean; url?: string | null; onClose: () => void }) {
  if (!open || !url) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-[90vw] max-w-4xl h-[80vh] rounded-lg bg-white shadow-lg overflow-hidden">
        <header className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="text-lg font-semibold">Vista previa</h3>
          <button onClick={onClose} className="text-sm text-gray-600">Cerrar</button>
        </header>
        <div className="h-full">
          {/* Use iframe for a simple preview; can be replaced with pdf.js later */}
          <iframe src={url} title="PDF preview" className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}

export default function MaterialsList() {
  const { user, loading } = useAuth();
  const role = user?.role ?? 'student';

  const [items, setItems] = useState<MaterialItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch manifest from public/materials/manifest.json
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/materials/manifest.json');
        if (!res.ok) throw new Error('No se encontró manifest de materiales');
        const data = await res.json();
        setItems(data as MaterialItem[]);
      } catch (err) {
        // fallback: leave items empty
        console.warn('No se cargó manifest de materiales:', err);
        setItems([]);
      }
    };
    load();
  }, []);

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <section className="mx-auto max-w-6xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recursos pedagógicos</h1>
        {role === 'teacher' && (
          <Button className="rounded-full bg-indigo-700 px-4 py-2 text-white" onClick={() => alert('Aquí abrirías el modal para subir material')}>
            Agregar material
          </Button>
        )}
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-gray-600">No hay recursos disponibles todavía. Añade un archivo <code>public/materials/manifest.json</code> con la lista de PDFs y súbelos a <code>public/materials/</code>.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((it) => {
            const fileUrl = `/materials/${it.file}`;
            const thumb = it.thumbnail ? `/materials/${it.thumbnail}` : undefined;
            return (
              <article key={it.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm flex flex-col">
                <div className="mb-3 h-40 w-full overflow-hidden rounded-md bg-gray-100 flex items-center justify-center">
                  {thumb ? (
                    <img src={thumb} alt={it.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-sm text-gray-500">PDF</div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{it.title}</h3>
                  {it.description && <p className="mt-1 text-sm text-gray-600">{it.description}</p>}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setPreviewUrl(fileUrl);
                        setPreviewOpen(true);
                      }}
                      className="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-700 hover:bg-indigo-100"
                    >
                      Previsualizar
                    </button>
                    <a href={fileUrl} download className="rounded-md px-3 py-1 text-sm text-indigo-600 hover:underline">Descargar</a>
                  </div>

                  {role === 'teacher' && <a href={`#edit-${it.id}`} className="text-sm text-gray-600 hover:underline">Editar</a>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <PreviewModal open={previewOpen} url={previewUrl ?? undefined} onClose={() => setPreviewOpen(false)} />
    </section>
  );
}
