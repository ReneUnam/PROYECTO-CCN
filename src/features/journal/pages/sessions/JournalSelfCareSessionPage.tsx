import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Save, CheckCircle2 } from "lucide-react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { LikertScale } from "@/features/journal/components/LikertScale";
import { ChipToggle } from "@/features/journal/components/ChipToggle";
import { startJournalEntry, getActiveItems, upsertAnswer, finalizeEntryAndStreak } from "@/features/journal/api/journalApi";
import { clearLocalAnswers, loadLocalAnswers, saveLocalAnswers, useBeforeUnloadDirty } from "@/features/journal/hooks/useJournalAutosave";
import { JournalCelebrate } from "../../components/JournalCelebrate";

export function JournalSelfCareSessionPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const [entryId, setEntryId] = useState<string | null>(sp.get("entry"));
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Record<number, Set<string>>>({});
  const [scales, setScales] = useState<Record<number, number | undefined>>({});

  const [celebrate, setCelebrate] = useState<{ current: number; best: number } | null>(null);
  const totalRequired = items.filter((i) => i.required).length;
  const totalAnswered = useMemo(() => {
    return items.filter((i) =>
      i.kind === "scale" ? scales[i.item_id] != null : (selected[i.item_id]?.size ?? 0) > 0
    ).length;
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

  function getLabels(it: any) {
    const min = it.scale_min ?? 1;
    const max = it.scale_max ?? 5;
    const n = Math.min(5, Math.max(2, max - min + 1));
    if (Array.isArray(it.scale_labels) && it.scale_labels.length) {
      return Array.from({ length: n }, (_, i) => (it.scale_labels[i] ?? "").trim());
    }
    const a = Array.from({ length: n }, () => "");
    if (it.scale_left_label) a[0] = String(it.scale_left_label);
    if (it.scale_right_label) a[n - 1] = String(it.scale_right_label);
    return a;
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const id = entryId ?? (await startJournalEntry("self-care"));
        setEntryId(id);

        const its = await getActiveItems("self-care");
        setItems(its);

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
      if (entryId) void upsertAnswer(entryId, itemId, { options: Array.from(next) });
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

  const onSaveDraft = () => navigate("/journal/self-care");

  const onFinish = async () => {
    if (!entryId) return;
    try {
      const s = await finalizeEntryAndStreak(entryId, "self-care");
      clearLocalAnswers(entryId);
      setCelebrate({ current: s.current_streak ?? 0, best: s.best_streak ?? 0 });
      setTimeout(() => navigate("/journal/self-care"), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section className="mx-auto max-w-6xl text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold">Diario de autocuido</h1>
            <p className="text-xs text-text/70">
              Respondidas: {Math.min(totalAnswered, totalRequired)}/{totalRequired}
            </p>
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
                  value={scales[it.item_id]}
                  onChange={(v) => setScale(it.item_id, v)}
                  min={it.scale_min ?? 1}
                  max={it.scale_max ?? 5}
                  labels={getLabels(it)}
                />
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap justify-start gap-2">
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

      <footer className="sticky bottom-0 border-t border-border bg-surface/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-stretch justify-end gap-2 sm:flex-row">
          <button
            onClick={onSaveDraft}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-muted"
          >
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

      {celebrate && (
        <JournalCelebrate
          title="¡Autocuidado completado!"
          subtitle="Tu bienestar crece con pequeños hábitos diarios."
          streak={celebrate}
        />
      )}
    </section>
  );
}