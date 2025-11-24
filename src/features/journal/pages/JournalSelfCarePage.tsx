import { useEffect, useState } from "react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { useToast } from "@/components/toast/ToastProvider";
import { useNavigate } from "react-router-dom";
import { startJournalEntry, getJournalHistory, getEntryAnswers, getTodayEntryStatus } from "@/features/journal/api/journalApi";
import { LikertScale } from "@/features/journal/components/LikertScale";

export default function JournalSelfCarePage() {
    const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{ entryId: string; rows: any[] } | null>(null);
  const [today, setToday] = useState<{ status: "none" | "draft" | "completed"; entryId?: string } | null>(null);
  const [starting, setStarting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [rows, t] = await Promise.all([
        getJournalHistory("self-care", 30),
        getTodayEntryStatus("self-care"),
      ]);
      setHistory(rows);
      setToday(t);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const start = async () => {
    try {
      setStarting(true);
      const entryId = await startJournalEntry("self-care");
      navigate(`/journal/session/self-care?entry=${entryId}`);
    } catch (e: any) {
      console.error("startJournalEntry error:", e);
      if (e?.code === "already_completed") await load();
      else if (e?.code === "no_version") toast.error("No hay versión publicada.");
      else toast.error(e.message || "Error al iniciar.");
    } finally {
      setStarting(false);
    }
  };

  const openAnswers = async (entryId: string) => {
    const rows = await getEntryAnswers(entryId);
    setAnswers({ entryId, rows });
  };

  const showCTA = today?.status !== "completed";
  const ctaText = today?.status === "draft" ? "Continuar sesión" : "Comenzar sesión";

  if (loading) return <FullScreenLoader />;

  return (
    <section className="mx-auto max-w-5xl px-3 text-text">
      <div className="mb-3">
        <button
          onClick={() => navigate('/journal')}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-white text-sm font-medium hover:bg-muted"
        >
          ← Volver
        </button>
      </div>
      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-gradient-to-r from-emerald-50 to-lime-50 p-4 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="text-3xl sm:text-4xl">🌿</div>
          <div>
            <div className="text-base font-semibold">Diario de autocuidado</div>
            {showCTA ? (
              <p className="text-sm text-text/70">Tienes una sesión nueva para hoy. Evalúa energía, sueño y hábitos.</p>
            ) : (
              <p className="text-sm text-text/70">Ya completaste tu diario de autocuidado hoy. ¡Bien hecho! ✨</p>
            )}
          </div>
        </div>
        {showCTA && (
          <button
            onClick={start}
            disabled={starting}
            className="mt-3 h-10 rounded-md bg-primary px-4 text-white hover:opacity-90 disabled:opacity-50 sm:mt-0"
          >
            {ctaText}
          </button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">Historial</div>
        {loading ? (
          <div className="py-10 text-center text-sm text-text/60">Cargando…</div>
        ) : history.length === 0 ? (
          <div className="py-10 text-center text-sm text-text/60">Sin sesiones anteriores.</div>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((h) => (
              <li key={h.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {new Date(h.entry_date ?? h.completed_at ?? h.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-text/60">{h.status === "completed" ? "Completada" : "Borrador"}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openAnswers(h.id)}
                    className="h-8 rounded-md border border-border px-3 text-sm hover:bg-muted"
                  >
                    Ver respuestas
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {answers && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-8" onClick={() => setAnswers(null)}>
          <div className="w-full max-w-2xl rounded-t-2xl border border-border bg-surface p-0 sm:rounded-2xl flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-surface px-4 py-3 border-b border-border">
              <div style={{ width: 84 }} />
              <h3 className="text-sm font-medium flex-1 text-center">Respuestas de la sesión</h3>
              <button className="h-8 rounded-md border border-border px-3 text-sm" onClick={() => setAnswers(null)}>Cerrar</button>
            </div>
            <div className="flex-1 overflow-auto pr-2 pb-16">
              <ul className="space-y-3 px-4 pt-2">
                {answers.rows.map((r, i) => (
                  <li key={i} className="rounded-lg border border-border p-3">
                    <div className="text-sm font-medium">{r.item?.prompt ?? `Ítem ${r.item_id}`}</div>
                    {r.item?.kind === "scale" ? (
                      <div className="mt-3">
                        <LikertScale
                          value={r.scale_value}
                          min={r.item?.scale_min ?? 1}
                          max={r.item?.scale_max ?? 5}
                          labels={Array.isArray(r.item?.scale_labels) ? r.item.scale_labels : null}
                          leftLabel={r.item?.scale_left_label}
                          rightLabel={r.item?.scale_right_label}
                          readOnly
                          showSelectionLabel
                        />
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(Array.isArray(r.options_values) && r.options_values.length > 0
                          ? (r.item?.options ?? []).filter((o: any) => r.options_values.includes(o.key))
                          : [])
                          .map((o: any) => (
                            <span key={o.key} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[13px]">
                              {o.emoji && <span>{o.emoji}</span>}
                              <span>{o.label ?? o.key}</span>
                            </span>
                          ))}
                        {(!r.options_values || r.options_values.length === 0) && (
                          <div className="text-xs text-text/60">Sin selección</div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <div className="h-16" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}