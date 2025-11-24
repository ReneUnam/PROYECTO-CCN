export function CardLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-xl bg-white/60 backdrop-blur-sm dark:bg-black/30"
        aria-hidden
      />

      <div className="relative z-30 flex w-56 flex-col items-center gap-4 rounded-lg border border-border/60 bg-white/80 px-6 py-6 shadow-lg backdrop-blur-sm dark:bg-white/5">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-sky-400 border-l-indigo-500 animate-[spin_1s_linear_infinite]" />
          <div className="absolute inset-1 rounded-full border-4 border-transparent border-t-indigo-400 border-l-sky-500 opacity-60 animate-[spin_1.5s_linear_infinite_reverse]" />
        </div>
        <div className="text-sm font-medium tracking-wide opacity-90">{label}</div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
