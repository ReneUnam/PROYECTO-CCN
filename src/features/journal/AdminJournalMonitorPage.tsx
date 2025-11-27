import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { useConfirm } from "@/components/confirm/ConfirmProvider";
import {
    adminListJournalEntries,
    adminGetEntryWithAnswers,
    type JournalType,
    adminDeleteEntry,
} from "@/features/journal/api/journalApi";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { LikertScale } from "./components/LikertScale";
import ReactDOM from "react-dom";
import { CalendarCheck } from "lucide-react";

type Row = {
    id: string;
    profile_id: string;
    type: JournalType;
    status: "draft" | "completed";
    entry_date: string;
    created_at: string;
    completed_at?: string | null;
    version_id?: number;
    profile: { id: string; name: string; identifier?: string };
};

export function AdminJournalMonitorPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<Row[]>([]);
    const [type, setType] = useState<JournalType | "all">("all");
    const [status, setStatus] = useState<"draft" | "completed" | "all">("all");
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<any | null>(null);
    const [openAnswers, setOpenAnswers] = useState<any | null>(null);
    const [fetchingAnswers, setFetchingAnswers] = useState(false);
    const [showFiltersMobile, setShowFiltersMobile] = useState(false);
    const resultsLabel = useMemo(() => `${rows.length} resultado${rows.length === 1 ? "" : "s"}`, [rows.length]);


    const load = async () => {
        setLoading(true);
        try {
            const { rows } = await adminListJournalEntries({
                type,
                status,
                from: from || undefined,
                to: to || undefined,
                search: search || undefined,
                limit: 200,
            });
            setRows(rows as Row[]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const applyFilters = () => {
        load();
    };

    const openEntry = async (id: string) => {
        setFetchingAnswers(true);
        try {
            const data = await adminGetEntryWithAnswers(id);
            setOpenAnswers(data);
        } catch (e) {
            console.error(e);
            toast.error("Error cargando respuestas");
        } finally {
            setFetchingAnswers(false);
        }
    };

    async function handleDeleteEntry(r: Row) {
        const isDraft = r.status === 'draft';
        const title = isDraft ? 'Eliminar entrada (borrador)' : 'Eliminar entrada completada';
        const message = isDraft
            ? 'Eliminar este borrador quitará respuestas guardadas y afectará al usuario. Esta acción no se puede deshacer. Escribe ELIMINAR para confirmar.'
            : 'Eliminar esta entrada completada quitará el registro del estudiante. Esta acción no se puede deshacer.';

        const ok = await confirm({
            title,
            message,
            confirmText: 'Eliminar',
            variant: 'danger',
            requireTextMatch: isDraft ? 'ELIMINAR' : undefined,
        });
        if (!ok) return;

        try {
            await adminDeleteEntry(r.id);
            setRows((prev) => prev.filter((x) => x.id !== r.id));
            toast.success('Entrada eliminada');
        } catch (e) {
            console.error('Error deleting entry', e);
            toast.error('No se pudo eliminar la entrada.');
        }
    }

    return (
        <section className="mx-auto max-w-7xl space-y-6 text-text px-3 md:px-0">
            <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="mb-3 flex items-center gap-3">
                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[color:var(--color-primary)] text-white shadow-sm" aria-hidden="true">
                        <CalendarCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">Monitor de diarios (Admin)</h1>
                        <p className="text-sm text-text/70">Visualiza y filtra las sesiones de los estudiantes.</p>
                    </div>
                </div>
                <button
                    className="md:hidden h-9 w-full rounded-md border border-border bg-surface text-sm hover:bg-muted"
                    onClick={() => setShowFiltersMobile((s) => !s)}
                >
                    {showFiltersMobile ? "Ocultar filtros" : "Mostrar filtros"}
                </button>
            </header>

            <div className={`rounded-xl border border-border bg-surface p-4 space-y-4 ${showFiltersMobile ? "" : "hidden md:block"}`}>
                <div className="grid gap-3 md:grid-cols-6">
                    {/* Tipo */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium">Tipo</label>
                        <select className="h-9 rounded-md border border-border bg-surface px-2 text-sm" value={type} onChange={(e) => setType(e.target.value as any)}>
                            <option value="all">Todos</option>
                            <option value="emotions">Emocional</option>
                            <option value="self-care">Autocuidado</option>
                        </select>
                    </div>
                    {/* Estado */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium">Estado</label>
                        <select className="h-9 rounded-md border border-border bg-surface px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                            <option value="all">Todos</option>
                            <option value="draft">No completado</option>
                            <option value="completed">Completado</option>
                        </select>
                    </div>
                    {/* Fechas */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium">Desde</label>
                        <input type="date" className="h-9 rounded-md border border-border bg-surface px-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium">Hasta</label>
                        <input type="date" className="h-9 rounded-md border border-border bg-surface px-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                    {/* Buscar */}
                    <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-xs font-medium">Buscar (nombre o id institucional)</label>
                        <input placeholder="Ej: ana, ana.gutierrez" className="h-9 rounded-md border border-border bg-surface px-2 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={applyFilters} className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90">Aplicar filtros</button>
                    <button
                        onClick={() => { setType("all"); setStatus("all"); setFrom(""); setTo(""); setSearch(""); load(); }}
                        className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
                    >
                        Limpiar
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border px-4 py-3 text-sm font-medium">
                    <span>Entradas</span>
                    <span className="text-xs text-text/60">{resultsLabel}</span>
                </div>

                {loading ? (
                    <div className="p-8"><FullScreenLoader /></div>
                ) : rows.length === 0 ? (
                    <div className="p-8 text-center text-sm text-text/60">Sin resultados.</div>
                ) : (
                    <>
                        {/* Desktop: tabla */}
                        <div className="overflow-auto hidden md:block">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-xs text-text/70">
                                        <th className="px-4 py-2 text-left font-medium">Fecha</th>
                                        <th className="px-4 py-2 text-left font-medium">Estudiante</th>
                                        <th className="px-4 py-2 text-left font-medium">ID institucional</th>
                                        <th className="px-4 py-2 text-left font-medium">Tipo</th>
                                        <th className="px-4 py-2 text-left font-medium">Estado</th>
                                        <th className="px-4 py-2 text-left font-medium">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr
                                            key={r.id}
                                            onClick={() => setSelected(r)}
                                            className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                                        >
                                            <td className="px-4 py-2">{r.entry_date || new Date(r.created_at).toLocaleDateString()}</td>
                                            <td className="px-4 py-2">{r.profile.name || "—"}</td>
                                            <td className="px-4 py-2">{r.profile.identifier || "—"}</td>
                                            <td className="px-4 py-2">{r.type === "emotions" ? "Emocional" : "Autocuidado"}</td>
                                            <td className="px-4 py-2">
                                                {r.status === "completed" ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">✅ Completado</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">⏳ No completado</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openEntry(r.id); }}
                                                        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                                                        disabled={r.status !== "completed"}
                                                    >
                                                        Ver
                                                    </button>
                                                    <button
                                                        title={r.status === 'draft' ? 'Eliminar (borrador)' : 'Eliminar entrada'}
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteEntry(r); }}
                                                        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50"
                                                    >
                                                        Borrar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile: cards */}
                        <ul className="md:hidden divide-y divide-border">
                            {rows.map((r) => (
                                <li key={r.id} className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="text-xs text-text/60">{r.entry_date || new Date(r.created_at).toLocaleDateString()}</div>
                                            <div className="text-sm font-medium">{r.profile.name || "—"}</div>
                                            <div className="text-xs text-text/60">{r.profile.identifier || "—"}</div>
                                            <div className="text-xs">
                                                <span className="rounded bg-muted px-2 py-0.5">{r.type === "emotions" ? "Emocional" : "Autocuidado"}</span>
                                            </div>
                                        </div>
                                        <div className="mt-1">
                                            {r.status === "completed" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">✅ Completado</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">⏳ No completado</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            className="h-9 flex-1 rounded-md border border-border text-sm hover:bg-muted disabled:opacity-50"
                                            onClick={() => setSelected(r)}
                                        >
                                            Detalle
                                        </button>
                                        <button
                                            className="h-9 flex-1 rounded-md bg-primary text-sm text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={() => openEntry(r.id)}
                                            disabled={r.status !== "completed"}
                                        >
                                            Ver respuestas
                                        </button>
                                        <button
                                            className="h-9 flex-none rounded-md border border-red-200 bg-red-50 px-3 text-sm text-red-600 hover:bg-red-100"
                                            onClick={() => handleDeleteEntry(r)}
                                            title={r.status === 'draft' ? 'Eliminar (borrador)' : 'Eliminar entrada'}
                                        >
                                            Borrar
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            {/* Detalle (bottom-sheet en móvil) */}
            {selected && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl
                 max-h-[80vh] overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold">Detalle de entrada</h3>
                            <button
                                className="h-9 rounded-md border border-border px-4 text-sm hover:bg-muted"
                                onClick={() => setSelected(null)}
                            >
                                Cerrar
                            </button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 flex items-center justify-center rounded-full
                                bg-gradient-to-br from-primary/80 to-sky-500/80 text-white text-sm font-semibold">
                                    {(selected.profile.name || "?").slice(0, 1)}
                                </div>
                                <div>
                                    <div className="font-medium">{selected.profile.name}</div>
                                    <div className="text-[11px] text-text/60">
                                        ID institucional: <b>{selected.profile.identifier || "—"}</b>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[13px]">
                                <div><b>Tipo:</b> {selected.type === "emotions" ? "Emocional" : "Autocuidado"}</div>
                                <div><b>Fecha:</b> {selected.entry_date || "—"}</div>
                                <div><b>Estado:</b> {selected.status === "completed" ? "Completado" : "No completado"}</div>
                                <div className="truncate"><b>ID:</b> {selected.id}</div>
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-2">
                            <button
                                className="h-10 rounded-md border border-border text-sm hover:bg-muted"
                                onClick={() => setSelected(null)}
                            >
                                Cerrar
                            </button>
                            <button
                                disabled={fetchingAnswers || selected.status !== "completed"}
                                onClick={() => openEntry(selected.id)}
                                className="h-10 rounded-md bg-primary text-sm text-white hover:bg-primary/90
                           disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {fetchingAnswers ? "Cargando..." : "Ver respuestas"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {openAnswers && ReactDOM.createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => setOpenAnswers(null)}
                >
                    <div
                        className="w-full max-w-4xl rounded-2xl border border-border bg-surface/95 backdrop-blur p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <h3 className="text-base font-semibold flex items-center gap-2">
                                    <span className="text-xl">📝</span>
                                    Diario {openAnswers.entry?.type === "emotions" ? "emocional" : "de autocuidado"}
                                </h3>
                                <p className="mt-1 text-xs text-text/60">
                                    {openAnswers.profile?.name} · {openAnswers.profile?.identifier || "—"} · {openAnswers.entry?.entry_date}
                                </p>
                            </div>
                            <button
                                className="h-9 rounded-md border border-border px-4 text-sm hover:bg-muted"
                                onClick={() => setOpenAnswers(null)}
                            >
                                Cerrar
                            </button>
                        </div>

                        <div className="h-[60vh] overflow-auto pr-3 space-y-5">
                            {openAnswers.answers.map((r: any, i: number) => {
                                const it = r.item;
                                if (!it) return null;
                                return (
                                    <div
                                        key={i}
                                        className="rounded-xl border border-border bg-gradient-to-br from-muted/40 to-muted/10 p-4"
                                    >
                                        <div className="text-sm font-medium mb-3">
                                            {it.prompt || `Pregunta ${i + 1}`}
                                        </div>
                                        {it.kind === "scale" ? (
                                            <LikertScale
                                                value={r.scale_value}
                                                min={it.scale_min}
                                                max={it.scale_max}
                                                labels={it.scale_labels}
                                                leftLabel={it.scale_left_label}
                                                rightLabel={it.scale_right_label}
                                                readOnly
                                                showSelectionLabel
                                            />
                                        ) : (
                                            <div className="mt-1 flex flex-wrap gap-2">
                                                {(Array.isArray(r.options_values) && r.options_values.length > 0
                                                    ? (it.options ?? []).filter((o: any) => r.options_values.includes(o.key))
                                                    : []
                                                ).map((o: any) => (
                                                    <span
                                                        key={o.key}
                                                        className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-[11px]"
                                                    >
                                                        {o.emoji && <span>{o.emoji}</span>}
                                                        {o.label || o.key}
                                                    </span>
                                                ))}
                                                {(!r.options_values || r.options_values.length === 0) && (
                                                    <span className="text-[11px] text-text/50">Sin selección</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {openAnswers.answers.length === 0 && (
                                <div className="text-xs text-text/60">Sin respuestas.</div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </section>
    );
}