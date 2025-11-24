import { useEffect, useRef, useState } from "react";
import {
  adminCloneVersion, adminPublish, adminGetForms, adminGetVersions, adminGetItems, adminUpsertItem, adminDeleteItem,
} from "@/features/journal/api/journalApi";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { Copy, NotebookPen, Pencil, Trash2 } from "lucide-react";
import { OptionEditor } from "@/features/journal/components/OptionEditor";
import { cn } from "@/lib/utils";
import { adminDeleteVersion, adminForceDeleteVersion, adminRenameVersion } from "@/features/journal/api/journalApi";
import { useConfirm } from "@/components/confirm/ConfirmProvider";
import { useToast } from "@/components/toast/ToastProvider";
import { ScaleLabelsEditor } from "../components/ScaleLabelsEditor";
import { updateJournalItemScale } from "@/features/journal/api/journalApi";
import { Input } from "@/components/ui/input";

export function JournalAdminPage() {
  const confirm = useConfirm();
  const { success, info } = useToast();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<any[]>([]);
  const [selectedForm, setSelectedForm] = useState<any | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [draftLabels, setDraftLabels] = useState<Record<number, string[]>>({});
  const saveTimers = useRef<Record<number, number>>({}); // itemId -> timer id

  const scheduleSaveScaleLabels = (it: any, next: string[]) => {
    // normaliza a 5 posiciones como máximo
    const trimmed = next.slice(0, 5);
    // limpia timer previo
    const t = saveTimers.current[it.id];
    if (t) window.clearTimeout(t);
    // guarda luego de 400ms sin cambios
    saveTimers.current[it.id] = window.setTimeout(async () => {
      const saved = await adminUpsertItem({ ...it, scale_labels: trimmed });
      setItems((xs) => xs.map((x) => (x.id === it.id ? saved : x)));
    }, 400);
  };

  // Helpers de escala
  const scaleCount = (it: any) => Math.min(5, Math.max(2, (Number(it.scale_max ?? 5) - Number(it.scale_min ?? 1) + 1) || 5));
  const getBufferedLabels = (it: any) => {
    const count = scaleCount(it);
    const buf = draftLabels[it.id] ?? it.scale_labels ?? [];
    // normaliza largo
    return Array.from({ length: count }, (_, i) => (buf[i] ?? ""));
  };

  async function handleDeleteItem(itId: number) {
    const ok = await confirm({
      title: "Eliminar pregunta",
      message: "¿Seguro que deseas eliminar esta pregunta? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;
    await adminDeleteItem(itId);
    setItems((xs) => xs.filter((x) => x.id !== itId));
    setDraftLabels((s) => {
      const next = { ...s };
      delete next[itId];
      return next;
    });
  }


  const hasNonEmptyName = (v: any) => typeof v?.name === "string" && v.name.trim().length > 0;

  const getVersionName = (v: any) => {
    const raw = (typeof v?.name === "string" ? v.name : "").trim();
    // Si no hay nombre, usa "Borrador" o "Versión" (sin número)
    if (!raw) return v.status === "draft" ? "Borrador" : "Versión";
    // Si el nombre es "Versión #<n>" (con o sin acento), muestra solo "Versión"
    const re = new RegExp(`^versi[óo]n\\s*#?${v.version_no}$`, "i");
    if (re.test(raw)) return "Versión";
    return raw;
  };

  const generateDefaultDraftName = (list: any[]) => {
    const names = new Set(
      list
        .filter((x) => x.status === "draft")
        .map((x) => (typeof x?.name === "string" ? x.name.toLowerCase() : ""))
    );
    if (!names.has("borrador")) return "Borrador";
    let n = 1;
    while (names.has(`borrador (${n})`)) n++;
    return `Borrador (${n})`;
  };


  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const fs = await adminGetForms();
        setForms(fs);
        if (fs.length) setSelectedForm(fs[0]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedForm) return;
    (async () => {
      const vs = await adminGetVersions(selectedForm.id);
      setVersions(vs);
      setSelectedVersion(vs[0] ?? null);
    })();
  }, [selectedForm]);

  useEffect(() => {
    if (!selectedVersion) return;
    (async () => {
      setItems(await adminGetItems(selectedVersion.id));
    })();
  }, [selectedVersion]);

  async function onClone() {
    // Create a new draft version on the server (the RPC may clone the
    // active version). To avoid carrying all active-version items into the
    // new draft, remove any items copied during cloning so the draft starts
    // empty and the admin can add items intentionally.
    const vid = await adminCloneVersion(selectedForm.type);
    // rename the draft to a sensible default if it has no explicit name
    const vs = await adminGetVersions(selectedForm.id);
    const justCreated = vs.find((v: any) => v.id === vid);
    const defaultName = generateDefaultDraftName(vs);
    if (justCreated && !hasNonEmptyName(justCreated)) {
      try { await adminRenameVersion(vid, defaultName); } catch { }
    }

    // Remove any items that were copied into the draft so it doesn't inherit
    // the full content of the active version.
    if (justCreated) {
      try {
        const copied = await adminGetItems(justCreated.id);
        if (Array.isArray(copied) && copied.length) {
          // delete each copied item (server-side RPCs enforce permissions)
          await Promise.all(copied.map((it: any) => adminDeleteItem(it.id)));
        }
      } catch (e) {
        // If deletion fails, do not block the UI; log for debugging.
        console.error("Failed to prune cloned items for new draft:", e);
      }
    }

    const refreshed = await adminGetVersions(selectedForm.id);
    setVersions(refreshed);
    setSelectedVersion(refreshed.find((v: any) => v.id === vid) ?? refreshed[0]);
    // ensure items view refreshes (effect will load items for selectedVersion)
    setItems([]);
    info("Se creó un borrador");
  }

  async function onPublish() {
    if (!selectedVersion) return;
    const ok = await confirm({
      title: "Publicar versión",
      message: "La versión actual publicada será archivada y esta pasará a publicada.",
      confirmText: "Publicar",
      variant: "publish",
    });
    if (!ok) return;
    await adminPublish(selectedForm.type, selectedVersion.id);
    const vs = await adminGetVersions(selectedForm.id);
    setVersions(vs);
    const published = vs.find((v: any) => v.id === selectedVersion.id) ?? vs.find((v: any) => v.status === "published");
    setSelectedVersion(published ?? null);
    success("Versión publicada");
  }

  async function onAddItem(kind: "scale" | "options") {
    const base =
      kind === "scale"
        ? { scale_min: 1, scale_max: 5, scale_left_label: "Muy mal", scale_right_label: "Muy bien" }
        : { options: [{ key: "ok", label: "OK", emoji: "👍" }], multi_select: true };
    const saved = await adminUpsertItem({
      version_id: selectedVersion.id,
      kind,
      prompt: "Nueva pregunta",
      required: true,
      sort_order: (items.at(-1)?.sort_order ?? 0) + 1,
      ...base,
    });
    setItems((x) => [...x, saved]);
  }

  if (loading) return <FullScreenLoader />;

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-text">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <NotebookPen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Administración del diario</h1>
            <p className="text-sm text-text/70">Edita preguntas y publica la versión activa</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-2 text-sm transition
             hover:bg-muted hover:shadow-sm active:scale-[0.97] hover:cursor-pointer"
            value={selectedForm?.id ?? ""}
            onChange={(e) => setSelectedForm(forms.find((f) => f.id === Number(e.target.value)))}
          >
            {forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.type === "emotions" ? "Diario emocional" : "Diario de autocuido"}
              </option>
            ))}
          </select>
          <button onClick={onClone} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-2 text-sm transition
             hover:bg-muted hover:shadow-sm active:scale-[0.97] hover:cursor-pointer">
            <Copy className="mr-1 inline h-4 w-4" /> Nueva versión (borrador)
          </button>
          <button
            onClick={onPublish}
            disabled={!selectedVersion || selectedVersion.status === "published"}
            className="rounded-md bg-primary px-3 py-2 text-sm text-white transition hover:bg-primary/90 hover:shadow-md active:scale-[0.97] disabled:opacity-60 hover:cursor-pointer">
            Publicar versión
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 text-sm">
          <div className="font-medium">Versiones</div>
          <div className="flex flex-wrap items-center gap-2">
            {versions.map((v) => {
              const isSelected = selectedVersion?.id === v.id;
              const isDeleting = deleting === v.id;
              const isEditing = editingId === v.id;
              const vName = getVersionName(v);
              const isDraft = v.status === "draft";
              const isArchived = v.status === "archived";
              const isPublished = v.status === "published";
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVersion(v)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedVersion(v)}
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition",
                    "hover:shadow-md hover:-translate-y-[2px] active:translate-y-[0px] hover:border-primary/50",
                    "focus:outline-none focus:ring-2 focus:ring-primary/40",
                    "cursor-pointer select-none",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary dark:text-white dark:border-primary/60"
                      : "border-border dark:border-border/60 hover:bg-muted/60 dark:hover:bg-muted/40"
                  )}
                >
                  <span className="px-0.5 text-text dark:text-tertiary transition">#{v.version_no}</span>

                  {isEditing ? (
                    <input
                      autoFocus
                      className="h-9 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition placeholder:text-tertiary/40
                    hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={async () => {
                        const name = editingName.trim() || getVersionName(v);
                        try { await adminRenameVersion(v.id, name); } catch { }
                        const vs = await adminGetVersions(selectedForm.id);
                        setVersions(vs);
                        setEditingId(null);
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") { setEditingId(null); setEditingName(""); }
                      }}
                    />
                  ) : (
                    <span className="max-w-[12rem] truncate text-text dark:text-tertiary transition">{vName}</span>
                  )}

                  {isPublished && (
                    <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white shadow-sm transition">
                      Publicado
                    </span>
                  )}
                  {isArchived && (
                    <span className="rounded bg-gray-500 px-1.5 py-0.5 text-[10px] text-white shadow-sm transition">
                      Archivado
                    </span>
                  )}

                  {!isPublished && !isEditing && (
                    <button
                      type="button"
                      className="ml-1 rounded-full p-1 text-text/70 hover:bg-muted hover:shadow-sm active:scale-95 transition cursor-pointer"
                      title="Renombrar"
                      onClick={(e) => { e.stopPropagation(); setEditingId(v.id); setEditingName(vName); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {isDraft && (
                    <button
                      type="button"
                      className="ml-1 rounded-full p-1 text-red-600 hover:bg-red-50 hover:shadow-sm active:scale-95 transition cursor-pointer disabled:opacity-50"
                      disabled={isDeleting}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const ok = await confirm({ title: "Eliminar borrador", message: "¿Eliminar este borrador de versión?", confirmText: "Eliminar", variant: "danger" });
                        if (!ok) return;
                        setDeleting(v.id);
                        try {
                          await adminDeleteVersion(v.id);
                          setVersions((prev) => {
                            const next = prev.filter((x) => x.id !== v.id);
                            if (selectedVersion?.id === v.id) {
                              setSelectedVersion(next[0] ?? null);
                              setItems([]);
                            }
                            return next;
                          });
                          success("Borrador eliminado");
                        } finally {
                          setDeleting(null);
                        }
                      }}
                      title={isDeleting ? "Eliminando..." : "Eliminar borrador"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {isPublished && (
                    <button
                      type="button"
                      className="ml-1 rounded-full p-1 text-red-600 hover:bg-red-50 hover:shadow-sm active:scale-95 transition cursor-pointer disabled:opacity-50"
                      disabled={isDeleting}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const ok = await confirm({ title: "Eliminar versión publicada", message: "Esta versión está publicada.\n¿Realmente deseas eliminarla?", confirmText: "Continuar", variant: "danger" });
                        if (!ok) return;
                        const second = await confirm({ title: "Confirmación adicional", message: "Escribe ELIMINAR para confirmar borrado definitivo.", confirmText: "Eliminar", variant: "danger", requireTextMatch: "ELIMINAR" });
                        if (!second) return;
                        setDeleting(v.id);
                        try {
                          await adminForceDeleteVersion(v.id);
                          setVersions((prev) => {
                            const next = prev.filter((x) => x.id !== v.id);
                            if (selectedVersion?.id === v.id) {
                              setSelectedVersion(next[0] ?? null);
                              setItems([]);
                            }
                            return next;
                          });
                        } finally {
                          setDeleting(null);
                        }
                      }}
                      title={isDeleting ? "Eliminando..." : "Eliminar publicada (forzar)"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onAddItem("scale")} className="rounded-md bg-primary px-3 py-2 text-sm text-white transition hover:bg-primary/90 hover:shadow-md active:scale-[0.97] disabled:opacity-60 hover:cursor-pointer">
              + Escala
            </button>
            <button onClick={() => onAddItem("options")} className="rounded-md bg-primary px-3 py-2 text-sm text-white transition hover:bg-primary/90 hover:shadow-md active:scale-[0.97] disabled:opacity-60 hover:cursor-pointer">
              + Opciones
            </button>
          </div>

          {items.map((it) => (
            <section
              key={it.id}
              className="rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:shadow-md hover:-translate-y-[2px] active:translate-y-[0px]"
            >
              {/* Header del ítem (prompt + requerida + quitar) */}
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <input
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition
                             placeholder:text-text/40 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  defaultValue={it.prompt ?? ""}
                  placeholder="Nueva pregunta"
                  onBlur={async (e) => {
                    const prompt = e.target.value.trim();
                    if (prompt === (it.prompt ?? "")) return;
                    const saved = await adminUpsertItem({ ...it, prompt });
                    setItems((xs) => xs.map((x) => (x.id === it.id ? saved : x)));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!it.required}
                      onChange={async (e) => {
                        const saved = await adminUpsertItem({ ...it, required: e.target.checked });
                        setItems((xs) => xs.map((x) => (x.id === it.id ? saved : x)));
                      }}
                    />
                    Requerida
                  </label>
                  <button
                    type="button"
                    title="Quitar"
                    onClick={async () => {
                      await handleDeleteItem(it.id)
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm transition
                               hover:bg-red-50 hover:text-red-600 hover:border-red-300 hover:shadow-sm active:scale-95 dark:hover:bg-red-500/10 hover:cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    Quitar
                  </button>
                </div>
              </div>
              {/* Resto sin cambios */}
              {it.kind === "scale" && (
                <div className="mt-4 space-y-4">
                  <ScaleLabelsEditor
                    item={it}
                    onItemUpdate={(saved) => {
                      setItems((xs) => xs.map((x) => (x.id === saved.id ? saved : x)));
                    }}
                  />
                </div>
              )}

              {it.kind === "options" && (
                <div className="mt-2 space-y-2 text-xs">
                  <OptionEditor
                    value={it.options ?? []}
                    onChange={async (next) => {
                      const saved = await adminUpsertItem({ ...it, options: next });
                      setItems((x) => x.map((y) => (y.id === it.id ? saved : y)));
                    }}
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!it.multi_select}
                      onChange={async (e) => {
                        const saved = await adminUpsertItem({ ...it, multi_select: e.target.checked });
                        setItems((x) => x.map((y) => (y.id === it.id ? saved : y)));
                      }}
                    />
                    Permitir selección múltiple
                  </label>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}