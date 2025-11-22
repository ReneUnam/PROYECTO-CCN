import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { useConfirm } from "@/components/confirm/ConfirmProvider";
import { Trash2, Play } from "lucide-react";
import { getMyEntries, deleteJournalEntry, startJournalEntry } from "@/features/journal/api/journalApi";

type EntryListProps = {
  title: string;
  items: { id: string; date: string; status: "draft" | "pending" | "completed"; description: string }[];
  emptyText: string;
  onDelete?: (id: string) => void;
  onResume?: (id: string) => void;
  deletingIds?: string[];
};

function EntryList({ title, items, emptyText, onDelete, onResume, deletingIds = [] }: EntryListProps) {
  const isDeleting = (id: string) => deletingIds.includes(id);

  const handleRowClick = (id: string) => {
    if (onResume && !isDeleting(id)) onResume(id);
  };

  const handleKey = (e: React.KeyboardEvent, id: string) => {
    if ((e.key === "Enter" || e.key === " ") && onResume && !isDeleting(id)) {
      e.preventDefault();
      onResume(id);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-surface">
      <header className="border-b border-border p-3 text-sm font-medium">{title}</header>
      <div className="p-3 text-sm">
        {items.length === 0 ? (
          <p className="text-text/60">{emptyText}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => {
              const disabled = isDeleting(it.id);
              return (
                <li
                  key={it.id}
                  role={onResume ? "button" : undefined}
                  tabIndex={onResume ? 0 : -1}
                  aria-disabled={disabled}
                  onClick={() => handleRowClick(it.id)}
                  onKeyDown={(e) => handleKey(e, it.id)}
                  className={[
                    "group flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 transition",
                    onResume ? "cursor-pointer hover:bg-muted/60 hover:shadow-sm active:scale-[0.99]" : "",
                    disabled ? "pointer-events-none opacity-60" : "",
                    "sm:items-center",
                  ].join(" ")}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium group-hover:text-primary">{it.description}</div>
                    <div className="text-xs text-text/70">{new Date(it.date).toLocaleString()}</div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {onResume && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onResume(it.id);
                        }}
                        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                      >
                        <Play className="mr-1 inline h-3 w-3" /> Continuar
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(it.id);
                        }}
                        className="rounded-md border border-border px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
                        disabled={disabled}
                        aria-disabled={disabled}
                      >
                        <Trash2 className="mr-1 inline h-3 w-3" /> {disabled ? "Eliminando..." : "Eliminar"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export function JournalTypePage({ type }: { type: "emotions" | "self-care" }) {
    const toast = useToast();
    const confirm = useConfirm();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  async function onStart() {
    const entry = await startJournalEntry(type);
    const route = type === "emotions" ? "/journal/session/emotions" : "/journal/session/self-care";
    navigate({ pathname: route, search: `?entry=${entry}` });
  }

  useEffect(() => {
    (async () => {
      const d = await getMyEntries(type, "draft").catch(() => []);
      const h = await getMyEntries(type, "completed").catch(() => []);
      setDrafts(d);
      setHistory(h);
    })();
  }, [type]);

  const onDeleteDraft = async (id: string) => {
    const ok = await confirm({
      title: "Eliminar borrador",
      message: "¿Eliminar borrador? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger"
    });
    if (!ok) return;

    setDeletingIds((s) => [...s, id]); // deshabilita fila/botones
    try {
      await deleteJournalEntry(id);
      // Limpia cualquier residuo local por si el backend no lo hizo
      try {
        localStorage.removeItem(`journal:entry:${id}`);
        localStorage.removeItem(`journal:answers:${id}`);
      } catch {}
      // Quita el borrador de la lista (y cualquier UI asociada a ese id)
      setDrafts((x) => x.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Error eliminando borrador:", err);
      toast.error("No se pudo eliminar el borrador. Intenta de nuevo.");
    } finally {
      setDeletingIds((s) => s.filter((x) => x !== id));
    }
  };

  const onResumeDraft = (id: string) => {
    const route = type === "emotions" ? "/journal/session/emotions" : "/journal/session/self-care";
    navigate({ pathname: route, search: `?entry=${id}` });
  };

  const presets = {
    emotions: {
      icon: "😌",
      title: "Diario emocional",
      description: "Registra emociones, sentimientos y sensaciones con apoyo visual.",
      action: "Comenzar sesión",
    },
    "self-care": {
      icon: "🌿",
      title: "Diario de autocuido",
      description: "Evalúa energía, sueño, actividad física y hábitos diarios.",
      action: "Comenzar sesión",
    },
  }[type];

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-text">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">{presets.title}</h1>
          <p className="text-sm text-text/70">{presets.description}</p>
        </div>
        <button onClick={onStart} className="rounded-md bg-primary px-3 py-2 text-sm text-white hover:bg-primary/90">
          {presets.action}
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <EntryList
          title="Borradores"
          items={drafts}
          emptyText="No tienes borradores."
          onDelete={onDeleteDraft}
          onResume={onResumeDraft}
          deletingIds={deletingIds}
        />
        <EntryList title="Historial" items={history} emptyText="Sin sesiones anteriores." />
      </div>
    </section>
  );
}