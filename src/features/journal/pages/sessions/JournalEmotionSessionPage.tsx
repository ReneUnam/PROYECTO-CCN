import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Save, CheckCircle2 } from "lucide-react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { LikertScale } from "@/features/journal/components/LikertScale";
import { ChipToggle } from "@/features/journal/components/ChipToggle";
import { startJournalEntry, getActiveItems, upsertAnswer, completeEntry } from "@/features/journal/api/journalApi";
import { clearLocalAnswers, loadLocalAnswers, saveLocalAnswers, useBeforeUnloadDirty } from "@/features/journal/hooks/useJournalAutosave";

export function JournalEmotionSessionPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [entryId, setEntryId] = useState<string | null>(sp.get("entry"));
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Local UI state
  const [selected, setSelected] = useState<Record<number, Set<string>>>({});
  const [scales, setScales] = useState<Record<number, number | undefined>>({});

  const getLabels = (it: any) => {
    if (Array.isArray(it.scale_labels) && it.scale_labels.length === 5) {
      return it.scale_labels.map((s: string) => s || "");
    }
    const left = it.scale_left_label || "Bajo";
    const right = it.scale_right_label || "Alto";
    return [left, "", "Medio", "", right];
  };
  // Guardar borrador si hay requeridos sin responder
  const totalRequired = items.filter((i) => i.required).length;
  const totalAnswered = useMemo(() => {
    const answered = items.filter((i) =>
      i.kind === "scale" ? scales[i.item_id] != null : (selected[i.item_id]?.size ?? 0) > 0
    ).length;
    return answered;
  }, [items, selected, scales]);
  const hasPendingRequired = useMemo(() => {
    const reqIds = new Set(items.filter((i) => i.required).map((i) => i.item_id));
    for (const id of reqIds) {
      const it = items.find((x) => x.item_id === id)!;
      if (it.kind === "scale" && scales[id] == null) return true;
      if (it.kind !== "scale" && (!selected[id] || selected[id].size === 0)) return true;
    }
    return false;
  }, [items, selected, scales]);
  useBeforeUnloadDirty(hasPendingRequired);

  // Carga inicial
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const id = entryId ?? (await startJournalEntry("emotions"));
        setEntryId(id);
        const its = await getActiveItems("emotions");
        setItems(its);

        // Restaurar de localStorage (borrador local)
        const saved = id ? loadLocalAnswers(id) : {};
        if (saved.selected) {
          setSelected(
            Object.fromEntries(Object.entries(saved.selected).map(([k, v]) => [Number(k), new Set(v as string[])]))
          );
        }
        if (saved.scales) setScales(saved.scales);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistencia local (autosave) cada cambio
  useEffect(() => {
    if (!entryId) return;
    const toSave = {
      selected: Object.fromEntries(Object.entries(selected).map(([k, v]) => [k, Array.from(v)])),
      scales,
    };
    saveLocalAnswers(entryId, toSave);
  }, [entryId, selected, scales]);

  if (loading) return <FullScreenLoader />;

  const toggleOption = async (itemId: number, key: string, multi: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev[itemId] ?? []);
      if (next.has(key)) next.delete(key);
      else {
        if (!multi) next.clear();
        next.add(key);
      }
      // Fire-and-forget server save with full selection
      const arr = Array.from(next);
      if (entryId) {
        void upsertAnswer(entryId, itemId, { options: arr });
      }
      return { ...prev, [itemId]: next };
    });
  };

  const setScale = async (itemId: number, v: number) => {
    setScales((s) => {
      const next = { ...s, [itemId]: v };
      if (entryId) void upsertAnswer(entryId, itemId, { scale: v });
      return next;
    });
  };

  const onSaveDraft = () => {
    // Ya se guarda automáticamente (local + servidor). Solo feedback/navegación.
    navigate("/journal");
  };

  const onFinish = async () => {
    if (!entryId) return;
    await completeEntry(entryId);
    clearLocalAnswers(entryId);
    navigate("/journal");
  };


  return (
    <section className="mx-auto max-w-6xl text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate(-1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold">Diario emocional</h1>
            <p className="text-xs text-text/70">Respondidas: {Math.min(totalAnswered, totalRequired)}/{totalRequired}</p>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-4">
        {items.map((it) => (
          <section key={it.item_id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <h2 className="text-sm font-semibold">{it.prompt}</h2>
            {!!it.helper && <p className="text-xs text-text/70">{it.helper}</p>}

            {it.kind === "scale" ? (
              <div className="mt-3">
                <LikertScale
                  name={`s-${it.item_id}`}
                  value={scales[it.item_id]}
                  onChange={(v: any) => setScale(it.item_id, v as number)}
                  labels={getLabels(it)}
                // responsive by default with your component styles
                />
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {(it.options ?? []).map((opt: any) => {
                  const set = selected[it.item_id] ?? new Set<string>();
                  const active = set.has(opt.key);
                  return (
                    <ChipToggle
                      key={opt.key}
                      active={active}
                      onClick={() => toggleOption(it.item_id, opt.key, !!it.multi_select)}
                    >
                      <span className="flex items-center gap-1">
                        {opt.emoji && <span>{opt.emoji}</span>}
                        <span>{opt.label ?? opt.key}</span>
                      </span>
                    </ChipToggle>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>

      <footer className="sticky bottom-0 border-t border-border bg-surface/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
        <div className="mx-auto flex max-w-6xl flex-col items-stretch justify-end gap-2 sm:flex-row">
          <button onClick={onSaveDraft} className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-muted">
            <Save className="h-4 w-4" /> Guardar borrador
          </button>
          <button
            onClick={onFinish}
            disabled={hasPendingRequired}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-600/90 disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" /> Finalizar
          </button>
        </div>
      </footer>
    </section>
  );
}