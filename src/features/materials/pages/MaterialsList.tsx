import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AddMaterialModal } from '../components/AddMaterialModal';
import { EditMaterialModal } from '../components/EditMaterialModal';
import { listMaterials, deleteMaterial } from '../api/materialsApi';

type MaterialItem = {
  id: string;
  title: string;
  description?: string | null;
  file_url: string; // public URL to PDF
  thumbnail_url?: string; // optional thumbnail image
  file_path: string; // storage path (for delete)
  thumbnail_path?: string | null; // storage path (for delete)
};

function PreviewModal({ open, url, onClose }: { open: boolean; url?: string | null; onClose: () => void }) {
  if (!open || !url) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
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
  // 1=admin, 2=teacher, 3=student
  const roleId = user?.role_id ?? 3;
  // Solo administrador puede agregar/editar/eliminar
  const canManage = roleId === 1;

  const [items, setItems] = useState<MaterialItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<null | { id: string; title: string; description?: string | null }>(null);

  // Fetch from DB (materials table); if empty, list will be []
  async function refresh() {
    try {
      const rows = await listMaterials();
      const mapped: MaterialItem[] = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description ?? undefined,
        file_url: r.file_url,
        thumbnail_url: r.thumbnail_url,
        file_path: r.file_path,
        thumbnail_path: r.thumbnail_path ?? null,
      }));
      setItems(mapped);
    } catch (e) {
      console.warn('No se pudo cargar materiales desde la BD:', e);
      setItems([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <section className="mx-auto max-w-6xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recursos pedagógicos</h1>
        {canManage && (
          <Button className="rounded-full bg-indigo-700 px-4 py-2 text-white" onClick={() => setAddOpen(true)}>
            Agregar material
          </Button>
        )}
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-gray-600">No hay recursos disponibles todavía. Añade un archivo <code>public/materials/manifest.json</code> con la lista de PDFs y súbelos a <code>public/materials/</code>.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((it) => {
            const fileUrl = it.file_url;
            const thumb = it.thumbnail_url;
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

                  {canManage && (
                    <button
                      onClick={() => {
                        setEditing({ id: it.id, title: it.title, description: it.description });
                        setEditOpen(true);
                      }}
                      className="text-sm text-gray-600 hover:underline"
                    >
                      Editar
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={async () => {
                        const ok = window.confirm('¿Eliminar este material? Esta acción no se puede deshacer.');
                        if (!ok) return;
                        try {
                          await deleteMaterial({ id: it.id, filePath: it.file_path, thumbnailPath: it.thumbnail_path ?? undefined });
                          await refresh();
                        } catch (err: any) {
                          alert(err?.message || 'No se pudo eliminar el material');
                        }
                      }}
                      className="ml-3 text-sm text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <PreviewModal open={previewOpen} url={previewUrl ?? undefined} onClose={() => setPreviewOpen(false)} />
      <AddMaterialModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={refresh} />
      <EditMaterialModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onUpdated={refresh}
        initial={editing}
      />
    </section>
  );
}
