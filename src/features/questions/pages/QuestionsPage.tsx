import { useMemo, useState, type JSX } from "react";
import { Link } from "react-router-dom";
import {
  ListChecks,
  Clock,
  CalendarClock,
  Users,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

type Status = "new" | "overdue" | "completed";

type Assignment = {
  id: string;
  title: string;
  group: string;
  questions: number;
  due: string; // solo visual
  status: Status;
};

const MOCK: Assignment[] = [
  { id: "a1", title: "Autoconocimiento I", group: "Grupo 2A", questions: 10, due: "Hoy 12:00", status: "new" },
  { id: "a2", title: "Manejo de emociones", group: "Grupo 2B", questions: 8, due: "Mañana 10:00", status: "new" },
  { id: "a3", title: "Comunicación asertiva", group: "Grupo 3A", questions: 12, due: "Ayer 17:00", status: "overdue" },
  { id: "a4", title: "Trabajo en equipo", group: "Grupo 1C", questions: 6, due: "15 Oct", status: "completed" },
];

export function QuestionsPage() {
  const [tab, setTab] = useState<Status>("new");

  const tabs: { key: Status; label: string }[] = [
    { key: "new", label: "Nuevas" },
    { key: "overdue", label: "Vencidas" },
    { key: "completed", label: "Completado" },
  ];

  const items = useMemo(() => MOCK.filter((i) => i.status === tab), [tab]);

  const badgeByStatus: Record<Status, { className: string; icon: JSX.Element; text: string }> = {
    new: {
      className: "border border-blue-200 bg-blue-50 text-blue-700",
      icon: <Clock className="h-3.5 w-3.5" />,
      text: "Nueva",
    },
    overdue: {
      className: "border border-red-200 bg-red-50 text-red-700",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      text: "Vencida",
    },
    completed: {
      className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      text: "Completada",
    },
  };

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-text">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted grid place-items-center">
            <HelpCircle className="h-5 w-5 text-text/70" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Preguntas asignadas</h1>
            <p className="text-sm text-text/70">Revisa y completa tus actividades</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                tab === t.key
                  ? "bg-primary text-white"
                  : "bg-muted text-text hover:bg-muted/80",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {items.map((a) => {
          const badge = badgeByStatus[a.status];
          return (
            <article
              key={a.id}
              className="rounded-xl border border-border bg-surface p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center text-primary">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{a.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text/80">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {a.group}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <HelpCircle className="h-4 w-4" />
                        {a.questions} preguntas
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-4 w-4" />
                        Entrega: {a.due}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className={["inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs", badge.className].join(" ")}>
                    {badge.icon}
                    {badge.text}
                  </span>
                  <Link
                    to={`/questions/session/${a.id}`}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90"
                  >
                    Abrir
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}