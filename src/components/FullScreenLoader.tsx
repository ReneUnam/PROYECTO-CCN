import ReactDOM from 'react-dom';

export function FullScreenLoader() {
    if (typeof window === 'undefined') return null;
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[999999] grid place-items-center bg-[color:var(--color-surface)]/40 text-[color:var(--color-text)] backdrop-blur-sm pointer-events-auto">
            {/* Fondo con halos suaves */}
            <div
                className="pointer-events-none absolute inset-0 opacity-80 dark:opacity-60"
                style={{
                    background:
                        'radial-gradient(800px 400px at -10% -20%, rgba(99,102,241,0.08), transparent 60%),' +
                        'radial-gradient(700px 350px at 110% 120%, rgba(14,165,233,0.08), transparent 60%)',
                }}
            />

            {/* Tarjeta glass */}
            <div className="relative z-10 flex flex-col items-center gap-6 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/90 px-10 py-8 shadow-2xl backdrop-blur-md">
                {/* Spinner circular moderno */}
                <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[color:var(--color-primary)] border-l-[color:var(--color-secondary)] animate-[spin_1s_linear_infinite]" />
                    <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-[color:var(--color-primary)] border-l-[color:var(--color-secondary)] opacity-60 animate-[spin_1.5s_linear_infinite_reverse]" />
                </div>

                {/* Texto minimalista */}
                <div className="text-sm font-medium tracking-wide opacity-95">Cargando…</div>
            </div>

            {/* Animaciones */}
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>,
        document.body
    );
}
