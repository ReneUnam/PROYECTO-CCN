
export function JournalCelebrate({
  title = "¡Buen trabajo hoy!",
  subtitle = "Gracias por darte un momento para ti.",
  streak,
}: { title?: string; subtitle?: string; streak?: { current: number; best: number } }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="relative w-[92vw] max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-xl">
        <div className="mb-2 text-4xl leading-none">✨</div>
        <div className="text-base font-semibold">{title}</div>
        <p className="mt-1 text-sm text-text/70">{subtitle}</p>
        {streak && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-text/70">
            Constancia: {streak.current} día{streak.current === 1 ? "" : "s"}
          </div>
        )}
      </div>
    </div>
  );
}