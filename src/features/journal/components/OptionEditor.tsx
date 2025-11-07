import { useMemo, useState } from "react";
import { X, Plus, Settings2 } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";

export type Option = { key: string; label: string; emoji?: string };

type Props = { value: Option[]; onChange: (next: Option[]) => void };

// helpers
const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "opcion";

export function OptionEditor({ value, onChange }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const list = useMemo(() => value, [value]);

  const uniqueKey = (base: string, idx: number) => {
    let k = base;
    let n = 2;
    const all = new Set(list.map((o, i) => (i === idx ? "__self__" : o.key)));
    while (all.has(k)) {
      k = `${base}-${n++}`;
    }
    return k;
  };

  const update = (idx: number, patch: Partial<Option>) => {
    const next = [...list];
    const prev = next[idx];
    // Sin “avanzado”, sincroniza key con label automáticamente
    if (!showAdvanced && patch.label != null) {
      const base = slugify(patch.label);
      patch.key = uniqueKey(base, idx);
    }
    next[idx] = { ...prev, ...patch };
    onChange(next);
  };

  const removeAt = (idx: number) => onChange(list.filter((_, i) => i !== idx));
  const addNew = () =>
    onChange([
      ...list,
      {
        key: uniqueKey(`opt-${Math.random().toString(36).slice(2, 5)}`, list.length),
        label: "Opción",
        emoji: "✨",
      },
    ]);

  return (
    <div className="space-y-2">
      {list.length === 0 && <p className="text-xs text-text/60">Sin opciones. Agrega al menos una.</p>}

      {list.map((opt, idx) => (
        <div key={idx} className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
            className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface text-lg"
            title="Elegir emoji"
          >
            {opt.emoji ?? "🙂"}
          </button>

          <input
            className="h-8 flex-1 rounded-md border border-border bg-surface px-2 text-sm"
            placeholder="Etiqueta visible"
            value={opt.label}
            onChange={(e) => update(idx, { label: e.target.value })}
          />

          {showAdvanced && (
            <input
              className="h-8 w-44 rounded-md border border-dashed border-border bg-surface px-2 text-xs"
              placeholder="key (única)"
              value={opt.key}
              onChange={(e) => {
                const base = slugify(e.target.value);
                update(idx, { key: uniqueKey(base, idx) });
              }}
            />
          )}

          <button
            type="button"
            onClick={() => removeAt(idx)}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm transition
                               hover:bg-red-50 hover:text-red-600 hover:border-red-300 hover:shadow-sm active:scale-95 dark:hover:bg-red-500/10 hover:cursor-pointer"
          >
            <X className="h-4 w-4 text-red-600" />
          </button>

          {openIdx === idx && (
            <div className="relative w-full">
              <div className="absolute z-10 mt-1 rounded-md border border-border bg-surface p-2 shadow">
                <EmojiPicker
                  onPick={(e) => {
                    update(idx, { emoji: e });
                    setOpenIdx(null);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addNew}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
        >
          <Plus className="h-3 w-3" /> Agregar opción
        </button>

        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
        >
          <Settings2 className="h-3 w-3" /> {showAdvanced ? "Ocultar claves (avanzado)" : "Mostrar claves (avanzado)"}
        </button>
      </div>

      {!showAdvanced && (
        <p className="text-[11px] text-text/60">
          La clave se genera automáticamente a partir de la etiqueta. Puedes editarla en “Mostrar claves (avanzado)”.
        </p>
      )}
    </div>
  );
}