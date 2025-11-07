
import { cn } from "@/lib/utils";

type Props = {
  name?: string;
  value?: number;
  onChange: (v: number) => void;
  // cantidad de puntos (2..5). Máximo 5.
  points?: number;
  // etiquetas por punto (mismo largo que points)
  labels?: string[];
  disabled?: boolean;
  className?: string;
};

// Helpers
const clampPoints = (n?: number) => Math.min(5, Math.max(2, n ?? 5));
const colors = ["bg-rose-500", "bg-orange-500", "bg-amber-400", "bg-lime-500", "bg-emerald-500"];

const sizeClass = (idx: number, count: number) => {
  const isEdge = idx === 0 || idx === count - 1;
  const isMiddle = count % 2 === 1 && idx === Math.floor(count / 2);
  if (isEdge) return "h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16"; // grande
  if (isMiddle) return "h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10"; // pequeño (centro)
  return "h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12"; // mediano
};

export function LikertScale({ name, value, onChange, points = 5, labels = [], disabled, className }: Props) {
  const count = clampPoints(points);
  const idxs = Array.from({ length: count }, (_, i) => i);

  const hasLabels = labels.length === count;
  const aria = (i: number) => (hasLabels ? labels[i] : `Nivel ${i + 1}`);

  // Contenedor centrado y ancho máximo para que no se “abra” demasiado en desktop
  return (
    <div className={cn("mx-auto w-full max-w-[520px] sm:max-w-[620px]", className)}>
      <div className="flex items-center justify-between gap-4 sm:gap-5">
        {idxs.map((i) => {
          const active = value === i + 1;
          const color = colors[i] ?? colors[colors.length - 1];
          return (
            <button
              key={i}
              type="button"
              name={name}
              aria-label={aria(i)}
              disabled={disabled}
              onClick={() => onChange(i + 1)}
              className={cn(
                "grid place-items-center rounded-full transition",
                active ? "scale-110 ring-2 ring-primary" : "opacity-90 hover:opacity-100"
              )}
            >
              <span className={cn("rounded-full", color, sizeClass(i, count))} />
            </button>
          );
        })}
      </div>

      <div className={cn("mt-2 grid text-center text-[11px] text-text/70 sm:text-xs", `grid-cols-${count}`)}>
        {idxs.map((i) => (
          <div key={i}>
            {hasLabels
              ? labels[i]
              : i === 0
              ? "Bajo"
              : i === Math.floor((count - 1) / 2) && count % 2 === 1
              ? "Medio"
              : i === count - 1
              ? "Alto"
              : ""}
          </div>
        ))}
      </div>
    </div>
  );
}