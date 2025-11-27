import { useEffect, useMemo, useState, type JSX } from "react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { useToast } from "@/components/toast/ToastProvider";
import { useConfirm } from "@/components/confirm/ConfirmProvider";
import { useNavigate } from "react-router-dom";
import {
  ListChecks, Clock, CalendarClock, Users, HelpCircle, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { getMyAssignments, startAssignment, getLastSessionId, getUserSessionsWithResponses, type Assignment as ApiAssignment } from "@/features/questions/api/assignmentsApi";

type Status = "new" | "overdue" | "completed";

type UiItem = ApiAssignment & {
  _status: Status;
  _dueText: string;
};

export function QuestionsPage() {
    const toast = useToast();
    const confirm = useConfirm();
  const [tab, setTab] = useState<Status>("new");
  const [data, setData] = useState<ApiAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getMyAssignments()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const items = useMemo<UiItem[]>(() => {
    const now = new Date();
    return (data ?? []).map((a) => {
      const end = a.end_at ? new Date(a.end_at) : null;
      const status: Status =
        a.completed >= a.max_attempts ? "completed" : end && end < now ? "overdue" : "new";
      return {
        ...a,
        _status: status,
        _dueText: end ? end.toLocaleString() : "Sin fecha",
      };
    }).filter((x) => x._status === tab);
  }, [data, tab]);

  const badgeByStatus: Record<Status, { className: string; icon: JSX.Element; text: string }> = {
    new:       { className: "border border-blue-200 bg-blue-50 text-blue-700",       icon: <Clock className="h-3.5 w-3.5" />,        text: "Nueva" },
    overdue:   { className: "border border-red-200 bg-red-50 text-red-700",          icon: <AlertTriangle className="h-3.5 w-3.5" />, text: "Vencida" },
    completed: { className: "border border-emerald-200 bg-emerald-50 text-emerald-700", icon: <CheckCircle2 className="h-3.5 w-3.5" />, text: "Completada" },
  };

  const openAssignment = async (a: UiItem) => {
    try {
      let sessionId: string | null = null;
      let readonly = "";
      if (a._status === "completed") {
        const sessions = await getUserSessionsWithResponses(a.assignment_id);
        if (!sessions.length) {
          toast.warning("No se encontró una sesión completada con respuestas para esta asignación.");
          return;
        }
        if (sessions.length === 1) {
          sessionId = sessions[0].id;
        } else {
          // Mostrar lista para elegir
          const options = sessions.map((s, i) => `${i + 1}. ${s.id} (${s.count} respuestas, ${s.started_at ? new Date(s.started_at).toLocaleString() : ''})`).join('\n');
          const choice = await confirm({
            title: "Selecciona sesión",
            message: `Tienes varias sesiones con respuestas para esta asignación.\nElige el número de la sesión a ver:\n${options}`,
            confirmText: "Ver sesión",
            cancelText: "Cancelar"
          }) ? window.prompt(`Escribe el número de la sesión a ver:\n${options}`) : null;
          const idx = Number(choice) - 1;
          if (choice == null || isNaN(idx) || idx < 0 || idx >= sessions.length) {
            toast.error("Selección inválida.");
            return;
          }
          sessionId = sessions[idx].id;
        }
        readonly = "&readonly=1";
      } else {
        sessionId = await startAssignment(a.assignment_id);
      }
      navigate(`/questions/session/${a.assignment_id}?session=${sessionId}${readonly}`);
    } catch (e: any) {
      toast.error(e.message || "No se pudo abrir la sesión");
    }
  };

    if (loading) return <FullScreenLoader />;

    return (
    <section className="mx-auto max-w-6xl space-y-6 text-text px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[color:var(--color-primary)] text-white shadow-sm" aria-hidden="true">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-lg font-semibold leading-tight">Preguntas asignadas</h1>
            <p className="text-sm text-text/70">Revisa y completa tus actividades</p>
          </div>
        </div>

        {/* Tabs scrollable en móvil */}
        <div className="flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["new","overdue","completed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors",
                tab===t ? "bg-primary text-white" : "bg-muted text-text hover:bg-muted/80",
              ].join(" ")}
            >
              {t === "new" ? "Nuevas" : t === "overdue" ? "Vencidas" : "Completado"}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {items.map((a) => {
          const badge = badgeByStatus[a._status];
          return (
            <article
              key={a.assignment_id}
              className="rounded-xl border border-border bg-surface p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Info */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center text-primary shrink-0">
                    <ListChecks className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{a.survey_name}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text/80">
                      <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />—</span>
                      <span className="inline-flex items-center gap-1"><CalendarClock className="h-4 w-4" />Entrega: {a._dueText}</span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-3 sm:justify-end">
                  <span className={["inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs", badge.className].join(" ")}>
                    {badge.icon}{badge.text}
                  </span>
                  <button
                    onClick={() => openAssignment(a)}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90"
                  >
                    {a._status === "completed" ? "Ver" : "Abrir"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {items.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-text/70">
            {tab === "new" && "No tienes preguntas nuevas asignadas por ahora."}
            {tab === "overdue" && "¡Excelente! No tienes preguntas vencidas."}
            {tab === "completed" && "Aún no has completado preguntas asignadas."}
          </div>
        )}
      </div>
    </section>
  );
}