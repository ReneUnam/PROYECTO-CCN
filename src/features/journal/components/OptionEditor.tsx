import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { X, Plus, Smile} from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";

export type Option = { key: string; label: string; emoji?: string };

// helpers
const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "opcion";

  type Props = {
  value: Option[];
  onChange: (next: Option[]) => void;
};

type LocalOption = Option & { _id: string; _buffer: string };

export function OptionEditor({ value, onChange }: Props) {
    const [local, setLocal] = useState<LocalOption[]>(() =>
    value.map((o, i) => ({ ...o, _id: crypto.randomUUID(), _buffer: o.label }))
  );
   // Sincroniza cuando value cambia externamente (por ejemplo carga inicial)
  useEffect(() => {
    setLocal((prev) => {
      // Mantener ids existentes por coincidencia de key
      return value.map((o) => {
        const found = prev.find((p) => p.key === o.key);
        return found
          ? { ...found, label: o.label, emoji: o.emoji, _buffer: o.label }
          : { ...o, _id: crypto.randomUUID(), _buffer: o.label };
      });
    });
  }, [value]);

    // Commit: actualiza key (slug) y emite onChange
  const commit = useCallback(
    (id: string) => {
      setLocal((prev) => {
        const nextLocal = prev.map((o) => {
          if (o._id !== id) return o;
            const finalLabel = o._buffer.trim();
            return {
              ...o,
              label: finalLabel,
              key: slugify(finalLabel), // sólo aquí cambia la key
            };
        });
        // Emitir lista sin campos internos
        onChange(nextLocal.map(({ _id, _buffer, ...rest }) => rest));
        return nextLocal;
      });
    },
    [onChange]
  );

  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [showAdvanced] = useState(false);
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

    // Editar buffer sin cambiar key ni emitir onChange inmediato
  const editBuffer = (id: string, txt: string) => {
    setLocal((prev) =>
      prev.map((o) => (o._id === id ? { ...o, _buffer: txt } : o))
    );
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

    const remove = (id: string) => {
    setLocal((prev) => {
      const next = prev.filter((o) => o._id !== id);
      onChange(next.map(({ _id, _buffer, ...rest }) => rest));
      return next;
    });
  };

  const removeAt = (idx: number) => onChange(list.filter((_, i) => i !== idx));
    const addNew = () => {
    setLocal((prev) => {
      const newOpt: LocalOption = {
        _id: crypto.randomUUID(),
        key: slugify("opcion-" + (prev.length + 1)),
        label: "Opción",
        emoji: "✨",
        _buffer: "Opción",
      };
      const next = [...prev, newOpt];
      onChange(next.map(({ _id, _buffer, ...rest }) => rest));
      return next;
    });
  };

   return (
    <div className="space-y-2">
      {local.map((opt) => (
        <div
          key={opt._id} // clave estable, NO la mutable slug/key
          className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1"
        >
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-md border border-border text-sm"
            onClick={() => {
              // Alternar emoji rápido (placeholder simple)
              const nextEmoji = opt.emoji === "👍" ? "✨" : "👍";
              setLocal((prev) =>
                prev.map((o) => (o._id === opt._id ? { ...o, emoji: nextEmoji } : o))
              );
              onChange(
                local.map(({ _id, _buffer, ...rest }) =>
                  rest.key === opt.key ? { ...rest, emoji: nextEmoji } : rest
                )
              );
            }}
          >
            {opt.emoji || <Smile className="h-4 w-4 opacity-60" />}
          </button>
          <input
            value={opt._buffer}
            onChange={(e) => editBuffer(opt._id, e.target.value)}
            onBlur={() => commit(opt._id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(opt._id);
              }
            }}
            className="flex-1 h-8 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none focus:border-primary"
            placeholder="Texto de la opción"
          />
          <button
            type="button"
            onClick={() => remove(opt._id)}
            className="grid h-8 w-8 place-items-center rounded-md text-red-600 hover:bg-red-600/10"
            aria-label="Quitar opción"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addNew}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
      >
        <Plus className="h-3 w-3" /> Agregar opción
      </button>
    </div>
  );
}