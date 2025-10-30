// ...existing code...
import { Link } from "react-router-dom";
export function JournalHubPage() {
  const cards = [
    {
      key: "emotions",
      title: "Diario emocional",
      description: "Registra emociones, sentimientos y sensaciones con emojis.",
      icon: "😌",
      route: "/journal/emotions",
      stats: { streak: 5, pending: 1, drafts: 2 },
    },
    {
      key: "self-care",
      title: "Diario de autocuido",
      description: "Evalúa energía, sueño, actividad física y autocalificación.",
      icon: "🌿",
      route: "/journal/self-care",
      stats: { streak: 3, pending: 0, drafts: 1 },
    },
  ];

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-text">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Elige tu diario de hoy</h1>
          <p className="text-sm text-text/70">Comienza una nueva sesión o continúa un borrador pendiente.</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.key}
            to={card.route}
            className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">{card.icon}</span>
              <div className="space-y-2">
                <h2 className="text-base font-semibold">{card.title}</h2>
                <p className="text-sm text-text/70">{card.description}</p>
                <dl className="grid grid-cols-3 text-xs text-text/60">
                  <div>
                    <dt>Racha</dt>
                    <dd className="text-sm font-semibold text-text">{card.stats.streak} días</dd>
                  </div>
                  <div>
                    <dt>Pendientes</dt>
                    <dd className="text-sm font-semibold text-text">{card.stats.pending}</dd>
                  </div>
                  <div>
                    <dt>Borradores</dt>
                    <dd className="text-sm font-semibold text-text">{card.stats.drafts}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
// ...existing code...