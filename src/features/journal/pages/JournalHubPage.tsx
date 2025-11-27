import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getStreak } from "@/features/journal/api/journalApi";
import { FullScreenLoader } from "@/components/FullScreenLoader";

export function JournalHubPage() {
  const [streakEmo, setStreakEmo] = useState(0);
  const [streakSelf, setStreakSelf] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [a, b] = await Promise.all([getStreak("emotions"), getStreak("self-care")]);
      setStreakEmo(a.current_streak ?? 0);
      setStreakSelf(b.current_streak ?? 0);
      setLoading(false);
    })();
  }, []);

  const cards = [
    { key: "emotions", title: "Diario emocional", description: "Registra emociones, sentimientos y sensaciones con emojis.", icon: "😌", route: "/journal/emotions", streak: streakEmo },
    { key: "self-care", title: "Diario de autocuido", description: "Evalúa energía, sueño, actividad física y autocalificación.", icon: "🌿", route: "/journal/self-care", streak: streakSelf },
  ];

  if (loading) return <FullScreenLoader />;

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-text">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Elige tu diario de hoy</h1>
          <p className="text-sm text-text/70">Comienza una nueva sesión o continúa tu hábito diario.</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.key} to={card.route} className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-start gap-4">
              <span className="text-4xl">{card.icon}</span>
              <div className="space-y-2">
                <h2 className="text-base font-semibold">{card.title}</h2>
                <p className="text-sm text-text/70">{card.description}</p>
                <div className="text-xs">
                  <span className="text-text/60">🔥Constancia:</span> <b>{card.streak}</b> días
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}