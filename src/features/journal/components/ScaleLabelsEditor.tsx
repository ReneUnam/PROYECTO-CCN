import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { adminUpdateItemScale } from "@/features/journal/api/journalApi";

type Props = {
  item: any;
  onItemUpdate: (saved: any) => void;
};

const DEBOUNCE = 400;

export function ScaleLabelsEditor({ item, onItemUpdate }: Props) {
  const [min, setMin] = useState<number>(item.scale_min ?? 1);
  const [max, setMax] = useState<number>(item.scale_max ?? 5);
  const [labels, setLabels] = useState<string[]>(toLen(item.scale_labels ?? [], countFrom(item.scale_min, item.scale_max)));

  const timer = useRef<number | null>(null);

  useEffect(() => {
    setMin(item.scale_min ?? 1);
    setMax(item.scale_max ?? 5);
    setLabels(toLen(item.scale_labels ?? [], countFrom(item.scale_min, item.scale_max)));
  }, [item.id, item.scale_min, item.scale_max]);

  const count = countFrom(min, max);

  const commit = async (next: { min?: number; max?: number; labels?: string[] }) => {
    const nmin = next.min ?? min;
    const nmax = next.max ?? max;
    const ncount = countFrom(nmin, nmax);
    const nlabels = toLen((next.labels ?? labels).map((s) => s.trim()), ncount);

    const saved = await adminUpdateItemScale(item.id, {
      scale_min: nmin,
      scale_max: nmax,
      scale_labels: nlabels,
    });
    onItemUpdate(saved);
  };

  const schedule = (nextLabels: string[]) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => commit({ labels: nextLabels }), DEBOUNCE) as any;
  };

  const handleMin = async (val: number) => {
    // min entre 1 y max-1 (para asegurar >= 2 puntos)
    const nmin = clamp(val, 1, Math.min(4, max - 1));
    setMin(nmin);
    const ncount = countFrom(nmin, max);
    setLabels((prev) => toLen(prev, ncount));
    await commit({ min: nmin });
  };

  const handleMax = async (val: number) => {
    // max entre min+1 y 5
    const nmax = clamp(val, Math.max(2, min + 1), 5);
    setMax(nmax);
    const ncount = countFrom(min, nmax);
    setLabels((prev) => toLen(prev, ncount));
    await commit({ max: nmax });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Etiquetas de la escala</p>
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex w-28 flex-col items-center">
            <Input
              value={labels[i] ?? ""}
              placeholder={`${(min ?? 1) + i}`}
              onChange={(e) => {
                const next = [...labels];
                next[i] = e.target.value;
                setLabels(next);
                schedule(next);
              }}
              onBlur={() => commit({ labels })}
              className="h-9 text-center"
            />
            <span className="mt-1 text-xs text-text/60">Punto {(min ?? 1) + i}</span>
          </div>
        ))}
      </div>

      <details className="rounded-md border border-border bg-muted/20 p-3">
        <summary className="cursor-pointer text-sm font-medium">Opciones avanzadas (Min/Max)</summary>
        <div className="mt-3 flex gap-6">
          <div>
            <div className="text-xs text-text/60 mb-1">Min</div>
            <Input
              type="number"
              value={min}
              min={1}
              max={Math.min(4, max - 1)}
              onChange={(e) => handleMin(Number(e.target.value))}
              className="h-9 w-20"
            />
          </div>
          <div>
            <div className="text-xs text-text/60 mb-1">Max</div>
            <Input
              type="number"
              value={max}
              min={Math.max(2, min + 1)}
              max={5}
              onChange={(e) => handleMax(Number(e.target.value))}
              className="h-9 w-20"
            />
          </div>
        </div>
      </details>

      <p className="text-xs text-text/60">Estos textos se muestran bajo cada punto. Si no colocas nada, se toman valores por defecto.</p>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function countFrom(min?: number, max?: number) {
  const m = min ?? 1;
  const M = max ?? 5;
  return clamp(M - m + 1, 2, 5);
}
function toLen(arr: string[], len: number) {
  const out = arr.slice(0, len);
  while (out.length < len) out.push("");
  return out;
}