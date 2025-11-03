export function FullScreenLoader() {
    return (
        <div className="relative min-h-dvh grid place-items-center bg-surface text-text overflow-hidden">
            {/* Fondo con halos suaves */}
            <div
                className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-60"
                style={{
                    background:
                        'radial-gradient(800px 400px at -10% -20%, rgba(99,102,241,0.08), transparent 60%),' +
                        'radial-gradient(700px 350px at 110% 120%, rgba(14,165,233,0.08), transparent 60%)',
                }}
            />

            {/* Tarjeta glass */}
            <div className="relative z-10 flex flex-col items-center gap-6 rounded-2xl border border-border/60 bg-white/70 px-12 py-10 shadow-2xl backdrop-blur-md dark:bg-white/5">
                {/* Spinner circular moderno */}
                <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-sky-400 border-l-indigo-500 animate-[spin_1s_linear_infinite]" />
                    <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-indigo-400 border-l-sky-500 opacity-60 animate-[spin_1.5s_linear_infinite_reverse]" />
                </div>

                {/* Texto minimalista */}
                <div className="text-sm font-medium tracking-wide opacity-90">Cargando…</div>
            </div>

            {/* Animaciones */}
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
