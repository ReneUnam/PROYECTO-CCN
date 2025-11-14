import { cn } from "@/lib/utils";

type Item = { id: string; prompt: string };

type Props = {
  items: Item[];
  answers: Record<string, number | undefined>;
  onChange: (id: string, value: number) => void;
  labels?: [string, string, string, string, string];
  className?: string;
};

const COLORS = ["bg-red-500","bg-orange-500","bg-amber-500","bg-lime-500","bg-emerald-500"];

export function LikertRowList({
  items,
  answers,
  onChange,
  labels = ["Terrible","Mal","Neutral","Bien","Muy bien"],
  className,
}: Props) {
  const sizes = ["h-14 w-14","h-12 w-12","h-10 w-10","h-12 w-12","h-14 w-14"]; // G–M–N–M–G

  return (
    <div className={cn("space-y-6", className)}>
      {items.map((it) => (
        <article key={it.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          {/* Pregunta arriba */}
          <h3 className="mb-3 text-sm font-medium">{it.prompt}</h3>

          {/* Fila de botones de color */}
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between gap-4">
              {labels.map((_, i) => {
                const val = i + 1;
                const active = answers[it.id] === val;
                return (
                  <label key={i} className="flex cursor-pointer select-none flex-col items-center">
                    <input
                      type="radio"
                      name={it.id}
                      value={val}
                      className="sr-only"
                      onChange={() => onChange(it.id, val)}
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "inline-block rounded-full ring-offset-2 transition-transform transform-gpu",
                        sizes[i],
                        COLORS[i],
                        active ? "ring-4 ring-black/10 scale-110" : "opacity-85 hover:opacity-100 hover:scale-105"
                      )}
                    />
                  </label>
                );
              })}
            </div>

            {/* Etiquetas en extremos (opcional) */}
            <div className="mt-2 flex items-center justify-between text-xs text-text/60">
              <span>{labels[0]}</span>
              <span>{labels[4]}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}