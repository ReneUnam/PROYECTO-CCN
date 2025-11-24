type Props = {
  value?: number | null;
  onChange?: (v: number | null) => void;
  labels?: string[] | null;
  min?: number | null;
  max?: number | null;
  disabled?: boolean;
  className?: string;
  leftLabel?: string;
  rightLabel?: string;
  readOnly?: boolean;
  showSelectionLabel?: boolean;
};

export function LikertScale({
  value,
  onChange,
  labels = null,
  min = 1,
  max = 5,
  disabled = false,
  className = "",
  leftLabel,
  rightLabel,
  readOnly = false,
  showSelectionLabel = false,
}: Props) {
  const safeMin = typeof min === "number" && !isNaN(min) ? min : 1;
  const safeMax = typeof max === "number" && !isNaN(max) ? max : 5;
  const rawLabels: string[] = Array.isArray(labels) ? labels : [];
  let count = safeMax - safeMin + 1;
  if (count < 2) count = 2;
  if (count > 5) count = 5;

  const padded = Array.from({ length: count }, (_, i) => (rawLabels[i] ?? "").trim());

  const sizeMap: Record<number, number[]> = {
    2: [1.0, 1.0],
    3: [1.1, 0.9, 1.1],
    4: [1.1, 0.95, 0.95, 1.1],
    5: [1.15, 0.95, 0.85, 0.95, 1.15],
  };
  const factors = sizeMap[count] ?? new Array(count).fill(1);
  const base = "clamp(42px, 10vw, 84px)";
  const start = { r: 37, g: 99, b: 235 };
  const end = { r: 16, g: 185, b: 129 };
  const lerp = (t: number) =>
    `rgb(${Math.round(start.r + (end.r - start.r) * t)},${Math.round(
      start.g + (end.g - start.g) * t
    )},${Math.round(start.b + (end.b - start.b) * t)})`;

  const hasEdgeLabels = padded[0] || padded[padded.length - 1];
  const showSideLabels = (leftLabel || rightLabel) && !hasEdgeLabels;

  return (
    <div className={className}>
      {showSideLabels && (
        <div className="mb-2 flex justify-between text-[10px] text-text/60 px-1">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}

      <div
        className="grid justify-items-center items-center gap-2 sm:gap-4"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0,1fr))` }}
      >
        {Array.from({ length: count }, (_, i) => {
          const val = safeMin + i;
          const displayVal = safeMin === 0 ? (i + 1) : val; // <- mostrar 1..N si min=0
          const active = value === val;
          const color = lerp(count === 1 ? 0 : i / (count - 1));
          const size = `calc(${base} * ${factors[i]})`;
          return (
            <button
              key={val}
              type="button"

              disabled={disabled || readOnly}
              onClick={() => {
                    if (disabled || readOnly) return;
                    if (active) {
                      onChange?.(null);
                    } else {
                      onChange?.(val);
                    }
                  }
              }
              className={
                "relative flex items-center justify-center rounded-full transition " +
                (active ? "scale-105" : "hover:scale-105") +
                ((disabled || readOnly) ? " cursor-default opacity-80" : " cursor-pointer")
              }
              style={{
                width: size,
                height: size,
                border: `3px solid ${color}`,
                background: active ? color : "transparent",
              }}
              aria-label={`Valor ${displayVal}`}
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

      <div
        className="mt-2 grid text-center text-xs sm:text-sm text-text/70"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0,1fr))` }}
      >
        {padded.map((txt, i) => (
          <div key={i} className="truncate px-1">
            {txt}
          </div>
        ))}
      </div>

      {showSelectionLabel && value != null && (
        <div className="mt-2 text-[11px] text-text/70">
          Seleccionado:{" "}
          <span className="font-medium">
            {padded[value - safeMin] || `Valor ${safeMin === 0 ? value + 1 : value}`}
          </span>
        </div>
      )}
    </div>
  );
}