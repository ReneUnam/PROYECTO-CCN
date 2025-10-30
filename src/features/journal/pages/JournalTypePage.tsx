// ...existing code...
import clsx from "clsx";
import { Link } from "react-router-dom";
type EntryListProps = {
  title: string;
  items: { id: string; date: string; status: "draft" | "pending" | "completed"; description: string }[];
  emptyText: string;
};

function EntryList({ title, items, emptyText }: EntryListProps) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Link to="#" className="text-xs text-primary hover:underline">
          Ver todo
        </Link>
      </header>
      <div className="max-h-64 overflow-y-auto divide-y divide-border">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-text/60">{emptyText}</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              to={`/journal/${item.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted"
            >
              <div>
                <div className="font-medium">{new Date(item.date).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" })}</div>
                <p className="text-xs text-text/70">{item.description}</p>
              </div>
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs",
                  item.status === "draft" && "bg-amber-100 text-amber-600",
                  item.status === "pending" && "bg-blue-100 text-blue-600",
                  item.status === "completed" && "bg-emerald-100 text-emerald-600"
                )}
              >
                {item.status === "draft" ? "Borrador" : item.status === "pending" ? "Pendiente" : "Completado"}
              </span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

export function JournalTypePage({ type }: { type: "emotions" | "self-care" }) {
  const presets = {
    emotions: {
      icon: "😌",
      title: "Diario emocional",
      description: "Registra emociones, sentimientos y sensaciones con apoyo visual.",
      route: "/journal/session/emotions",
      drafts: [{ id: "draft-01", date: "2025-10-29", status: "draft" as const, description: "Sesión guardada a medias" }],
      pending: [{ id: "pending-01", date: "2025-10-28", status: "pending" as const, description: "Sesión pendiente del día anterior" }],
      history: [{ id: "done-01", date: "2025-10-27", status: "completed" as const, description: "Sesión completada con 12 emociones" }],
    },
    "self-care": {
      icon: "🌿",
      title: "Diario de autocuido",
      description: "Evalúa energía, sueño, actividad física y hábitos diarios.",
      route: "/journal/session/self-care",
      drafts: [],
      pending: [],
      history: [{ id: "done-02", date: "2025-10-29", status: "completed" as const, description: "Autoevaluación enviada" }],
    },
  }[type];

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-text">
      <header className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="text-4xl">{presets.icon}</span>
            <div>
              <h1 className="text-lg font-semibold">{presets.title}</h1>
              <p className="text-sm text-text/70">{presets.description}</p>
            </div>
          </div>
          <Link
            to={presets.route}
            className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90"
          >
            Comenzar sesión
          </Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <EntryList title="Borradores" items={presets.drafts} emptyText="No tienes borradores guardados." />
        <EntryList title="Sesiones pendientes" items={presets.pending} emptyText="No hay sesiones pendientes." />
        <EntryList title="Historial" items={presets.history} emptyText="Aún no registras sesiones." />
      </div>
    </section>
  );
}
// ...existing code...