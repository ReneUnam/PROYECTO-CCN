import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function MaterialsList() {
  const { user, loading } = useAuth();
  const role = user?.role ?? 'student';

  const [items, setItems] = useState<Array<{ id: string; title: string; description?: string }>>([]);

  // mock loader — en el futuro conecta a la API
  useEffect(() => {
    setItems([
      { id: 'm1', title: 'Guía didáctica: Inteligencia emocional', description: 'Actividades y estrategias para el aula.' },
      { id: 'm2', title: 'Plantillas de evaluación', description: 'Formatos para registro y seguimiento.' },
      { id: 'm3', title: 'Presentación: Sesiones de bienestar', description: 'Slides para guiar sesiones grupales.' },
    ]);
  }, []);

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <section className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recursos pedagógicos</h1>
        {role === 'teacher' && (
          <Button className="rounded-full bg-indigo-700 px-4 py-2 text-white" onClick={() => alert('Aquí abrirías el modal para subir material')}>
            Agregar material
          </Button>
        )}
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-gray-600">No hay recursos disponibles todavía.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map((it) => (
            <article key={it.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{it.title}</h3>
                  {it.description && <p className="mt-1 text-sm text-gray-600">{it.description}</p>}
                </div>

                <div className="flex items-center gap-3">
                  <a href={`#download-${it.id}`} className="text-sm text-indigo-600 hover:underline">Descargar</a>
                  {role === 'teacher' && <a href={`#edit-${it.id}`} className="text-sm text-gray-600 hover:underline">Editar</a>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
