
export function StreakCelebration({ current, best }: { current: number; best: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[90vw] max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-xl">
        <div className="absolute inset-0 -z-10 animate-pulse rounded-2xl bg-gradient-to-tr from-amber-200/25 via-emerald-200/25 to-sky-200/25" />
        <div className="mb-2 text-5xl animate-bounce">🔥</div>
        <div className="text-lg font-semibold">¡Racha activada!</div>
        <div className="mt-1 text-sm text-text/70">
          Racha actual: <b>{current}</b> · Mejor racha: <b>{best}</b>
        </div>
        <div className="mt-4 mx-auto h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-2 w-full animate-[grow_1.6s_ease-out_forwards] rounded-full bg-emerald-500" />
        </div>
      </div>
      <style>
        {`@keyframes grow { from { transform: translateX(-100%);} to { transform: translateX(0);} }`}
      </style>
    </div>
  );
}