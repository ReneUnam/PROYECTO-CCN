import { Plus, Pencil, Copy, Archive, NotebookPen, Filter } from "lucide-react";

const MOCK = [
  { id: "m1", title: "Diario diario (5 puntos)", items: 6, updatedAt: "Hoy 10:20" },
  { id: "m2", title: "Chequeo semanal bienestar", items: 8, updatedAt: "Ayer 18:05" },
  { id: "m3", title: "Autoevaluación emocional", items: 5, updatedAt: "12 Oct" },
];

export function JournalAdminPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-6 text-text">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <NotebookPen className="h-5 w-5" />
          </div>
        <div>
            <h1 className="text-lg font-semibold">Administración del diario</h1>
            <p className="text-sm text-text/70">Crea y gestiona plantillas de preguntas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-muted">
            <Filter className="h-4 w-4" /> Filtros
          </button>
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-white hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Nueva plantilla
          </button>
        </div>
      </div>

      {/* Grid de plantillas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK.map((tpl) => (
          <article key={tpl.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <h3 className="font-medium">{tpl.title}</h3>
            <p className="mt-1 text-sm text-text/70">{tpl.items} preguntas | Última edición: {tpl.updatedAt}</p>

            <div className="mt-4 flex items-center justify-between">
              <span className="rounded-full bg-muted px-2 py-1 text-xs text-text/70">Escala Likert (1–5)</span>
              <div className="flex items-center gap-2">
                <button className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted" title="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted" title="Duplicar">
                  <Copy className="h-4 w-4" />
                </button>
                <button className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted" title="Archivar">
                  <Archive className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Tabla simple (solo UI) */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">Historial de publicaciones</div>
        <div className="divide-y divide-border text-sm">
          {[1,2,3].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Publicación #{i}
              </div>
              <div className="text-text/70">Grupo 2A · 18 estudiantes · 15 Oct</div>
              <button className="rounded-md border border-border px-2 py-1 hover:bg-muted">Ver</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}