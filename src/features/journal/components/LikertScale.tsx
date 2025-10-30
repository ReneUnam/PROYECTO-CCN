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
const big = size === "sm" ? "h-10 w-10" : "h-16 w-16";
  const med = size === "sm" ? "h-9 w-9" : "h-14 w-14";
  const norm = size === "sm" ? "h-8 w-8" : "h-12 w-12";
  const DOT_SIZES = [big, med, norm, med, big]; // izq->der: Grande, Med, Normal, Med, Grande
  // const text = size === "sm" ? "text-[11px]" : "text-xs";
  // const gap = size === "sm" ? "gap-5" : "gap-10";

  return (
    <div className={cn("w-full", className)}>
       <div className={cn("flex items-end justify-center gap-8")}>
        {labels.map((label, i) => {
          const idx = i + 1;
          const active = value === idx;
          return (
            <label key={label} className="flex cursor-pointer select-none flex-col items-center gap-2">
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
                  "inline-block rounded-full ring-offset-2 transition-transform",
                  DOT_SIZES[i],
                  COLORS[i],
                  disabled
                    ? "opacity-30"
                    : active
                    ? "scale-110 ring-4 ring-black/10"
                    : "opacity-85 hover:scale-105 hover:opacity-100"
                )}
              />
              <span className={cn("text-center text-sm text-text/70 leading-none")}>{label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}