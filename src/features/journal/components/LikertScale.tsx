import { cn } from "@/lib/utils";

type LikertScaleProps = {
  name: string;
  value?: number;
  onChange?: (val: number) => void;
  labels?: [string, string, string, string, string];
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
};

const COLORS = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"];

export function LikertScale({
  name,
  value,
  onChange,
  labels = ["Terrible", "Mal", "Neutral", "Bien", "Muy bien"],
  size = "md",
  disabled,
  className,
}: LikertScaleProps) {
  const big = size === "sm" ? "h-6 w-6" : "h-9 w-9";
  const med = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  const norm = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  const DOT_SIZES = [big, med, norm, med, big]; // izq->der: Grande, Med, Normal, Med, Grande
  const text = size === "sm" ? "text-[11px]" : "text-xs";
  const gap = size === "sm" ? "gap-2" : "gap-3";

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("flex items-start justify-center", gap)}>
        {labels.map((label, i) => {
          const idx = i + 1;
          const active = value === idx;
          return (
            <label key={label} className="flex cursor-pointer select-none flex-col items-center gap-1">
              <input
                type="radio"
                name={name}
                value={idx}
                className="sr-only"
                disabled={disabled}
                aria-label={label}
                onChange={() => onChange?.(idx)}
              />
              <span
                aria-hidden
                className={cn(
                  "inline-block rounded-full transition-transform ring-offset-1",
                  DOT_SIZES[i],
                  COLORS[i],
                  disabled
                    ? "opacity-30"
                    : active
                    ? "ring-4 ring-black/10 scale-110"
                    : "opacity-80 hover:opacity-90"
                )}
              />
              <span className={cn("text-center leading-tight text-text/70", text)}>{label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}