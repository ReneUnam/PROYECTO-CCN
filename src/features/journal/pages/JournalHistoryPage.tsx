import { CalendarDays, NotebookPen, TrendingUp, Flame, Search } from "lucide-react";
import { Link } from "react-router-dom";

type Entry = {
  id: string;
  date: string;        // ISO string
  title: string;
  avg: number;         // 1..5
  notes?: string;
};

const MOCK: Entry[] = [
  { id: "e-2025-10-29", date: "2025-10-29", title: "Diario diario", avg: 4.2, notes: "Día productivo, buena energía." },
  { id: "e-2025-10-28", date: "2025-10-28", title: "Diario diario", avg: 3.0, notes: "Cansado, pero estable." },
  { id: "e-2025-10-27", date: "2025-10-27", title: "Diario diario", avg: 2.4, notes: "Estrés por tareas." },
  { id: "e-2025-10-26", date: "2025-10-26", title: "Diario diario", avg: 4.8, notes: "Fin de semana excelente." },
];

function scoreColor(v: number) {
  if (v >= 4.5) return "text-emerald-600";
  if (v >= 3.5) return "text-lime-600";
  if (v >= 2.5) return "text-amber-600";
  return "text-red-600";
}

export function JournalHistoryPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-6 text-text">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <NotebookPen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Mi diario</h1>
            <p className="text-sm text-text/70">Revisa tus registros por día</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/journal"
            className="rounded-md bg-primary px-3 py-2 text-sm text-white hover:bg-primary/90"
          >
            Nueva entrada
          </Link>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-sm text-text/70">
            <TrendingUp className="h-4 w-4" /> Promedio últimos 7 días
          </div>
          <div className="mt-2 text-2xl font-semibold">
            <span className={scoreColor(3.9)}>3.9</span> / 5
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-sm text-text/70">
            <Flame className="h-4 w-4" /> Racha activa
          </div>
          <div className="mt-2 text-2xl font-semibold">5 días</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-sm text-text/70">
            <CalendarDays className="h-4 w-4" /> Última entrada
          </div>
          <div className="mt-2 text-2xl font-semibold">Hoy</div>
        </div>
      </div>

      {/* Filtros simples */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text/50" />
          <input
            placeholder="Buscar comentario..."
            className="h-9 w-72 rounded-md border border-border bg-surface pl-9 pr-3 text-sm outline-none ring-primary/30 focus:ring"
          />
        </div>
        <select className="h-9 rounded-md border border-border bg-surface px-2 text-sm outline-none ring-primary/30 focus:ring">
          <option>Últimos 30 días</option>
          <option>Últimos 7 días</option>
          <option>Este mes</option>
        </select>
      </div>

      {/* Lista de días */}
      <div className="space-y-3">
        {MOCK.map((e) => (
          <article
            key={e.id}
            className="rounded-xl border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm text-text/70">
                  {new Date(e.date).toLocaleDateString("es-MX", {
                    weekday: "long",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <h3 className="text-base font-medium">{e.title}</h3>
                {e.notes && <p className="mt-1 line-clamp-2 text-sm text-text/75">{e.notes}</p>}
              </div>

              <div className="flex items-center gap-4">
                {/* Mini barra de promedio */}
                <div className="w-40">
                  <div className="mb-1 flex items-center justify-between text-xs text-text/70">
                    <span>Promedio</span>
                    <span className={scoreColor(e.avg)}>{e.avg.toFixed(1)} / 5</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(e.avg / 5) * 100}%` }}
                    />
                  </div>
                </div>

                <Link
                  to={`/journal`} // más adelante a detalle /journal/entry/:id
                  className="rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-muted"
                >
                  Ver detalle
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}