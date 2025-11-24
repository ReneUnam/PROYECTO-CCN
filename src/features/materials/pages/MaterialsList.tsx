import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { AddMaterialModal } from '../components/AddMaterialModal';
import { EditMaterialModal } from '../components/EditMaterialModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
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
  if (typeof window === 'undefined' || !open || !url) return null;
  const modal = (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-[90vw] max-w-4xl h-[80vh] rounded-lg bg-[color:var(--color-surface)] shadow-lg overflow-hidden border border-[color:var(--color-border)]">
        <header className="flex items-center justify-between p-3 border-b border-[color:var(--color-border)]">
          <h3 className="text-lg font-semibold">Vista previa</h3>
          <button onClick={onClose} className="text-sm text-[color:var(--color-text)]">Cerrar</button>
        </header>
        <div className="h-full bg-[color:var(--color-surface)]">
          {/* Use iframe for a simple preview; can be replaced with pdf.js later */}
          <iframe src={url} title="PDF preview" className="h-full w-full bg-[color:var(--color-surface)]"/>
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<null | { id: string; file_path?: string | null; thumbnail_path?: string | null }>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch from DB (materials table); if empty, list will be []
  async function refresh() {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="mx-auto max-w-6xl p-6 relative">
      {isLoading && <FullScreenLoader />}
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recursos pedagógicos</h1>
        {canManage && (
          <Button className="rounded-full bg-[color:var(--color-primary)] text-white" onClick={() => setAddOpen(true)}>
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

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {/* Fila 1 */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setPreviewUrl(fileUrl);
                      setPreviewOpen(true);
                    }}
                  >
                    Previsualizar
                  </Button>
                  <a
                    href={fileUrl}
                    download
                    className="w-full inline-flex items-center justify-center select-none rounded-xl font-medium
                               transition-[transform,box-shadow,background-color,opacity] duration-150 ease-out
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]
                               focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-surface)]
                               cursor-pointer border border-[color:var(--color-border)] h-9 px-3 text-sm
                               bg-[color:var(--color-surface)] text-[color:var(--color-text)] shadow-sm
                               hover:-translate-y-0.5 hover:shadow-md hover:bg-black/5 dark:hover:bg-white/10 active:translate-y-[1px]"
                  >
                    Descargar
                  </a>

                  {/* Fila 2 (solo admin) */}
                  {canManage && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setEditing({ id: it.id, title: it.title, description: it.description });
                          setEditOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setToDelete({ id: it.id, file_path: it.file_path, thumbnail_path: it.thumbnail_path ?? null });
                          setConfirmOpen(true);
                        }}
                      >
                        Eliminar
                      </Button>
                    </>
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
      <ConfirmDialog
        open={confirmOpen}
        title="¿Eliminar este material?"
        description="Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        danger
        onCancel={() => {
          setConfirmOpen(false);
          setToDelete(null);
        }}
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteMaterial({ id: toDelete.id, filePath: toDelete.file_path ?? undefined, thumbnailPath: toDelete.thumbnail_path ?? undefined });
          setConfirmOpen(false);
          setToDelete(null);
          await refresh();
        }}
      />
    </section>
  );
}
