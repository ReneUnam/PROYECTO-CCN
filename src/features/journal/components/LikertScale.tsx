
type Props = {
  value?: number;
  onChange?: (v: number) => void;
  labels?: string[];
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
};

export function LikertScale({
  value,
  onChange,
  labels = [],
  min = 1,
  max = 5,
  disabled = false,
  className = "",
}: Props) {
  const count = Math.min(5, Math.max(2, (max ?? 5) - (min ?? 1) + 1));
  const padded = Array.from({ length: count }, (_, i) => (labels[i] ?? "").trim());

  // tamaños base usando clamp para móvil → desktop
  const sizeMap: Record<number, number[]> = {
    2: [1.00, 1.00],
    3: [1.10, 0.90, 1.10],
    4: [1.10, 0.95, 0.95, 1.10],
    5: [1.15, 0.95, 0.85, 0.95, 1.15],
  };
  const factors = sizeMap[count];
  const base = "clamp(42px, 10vw, 84px)"; // compacto en móvil, cómodo en desktop

  // azul → verde
  const start = { r: 37, g: 99, b: 235 }; // #2563eb
  const end   = { r: 16, g: 185, b: 129 }; // #10b981
  const lerp = (t: number) =>
    `rgb(${Math.round(start.r + (end.r - start.r) * t)},${Math.round(start.g + (end.g - start.g) * t)},${Math.round(start.b + (end.b - start.b) * t)})`;

  return (
    <div className={className}>
      {/* fila recta, sin “N”, con separación corta en móvil */}
      <div
        className="grid justify-items-center items-center gap-2 sm:gap-4 "
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0,1fr))` }}
      >
        {Array.from({ length: count }, (_, i) => {
          const val = (min ?? 1) + i;
          const active = value === val;
          const color = lerp(i / (count - 1));
          const size = `calc(${base} * ${factors[i]})`;
          return (
            <button
              key={val}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange?.(val)}
              className={[
                "relative flex items-center justify-center rounded-full transition hover:cursor-pointer ",
                active ? "scale-105" : "hover:scale-105 hover:cursor-pointer ",
                disabled ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
              style={{
                width: size,
                height: size,
                border: `3px solid ${color}`,
                background: active ? color : "transparent",
              }}
              aria-label={`Valor ${val}`}
            >
              {active && (
                <svg
                  viewBox="0 0 24 24"
                  width="36%"
                  height="36%"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* etiquetas debajo */}
      <div
        className="mt-2 grid text-center text-xs sm:text-sm text-text/70"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0,1fr))` }}
      >
        {padded.map((txt, i) => (
          <div key={i} className="truncate px-1">{txt}</div>
        ))}
      </div>
    </div>
  );
}