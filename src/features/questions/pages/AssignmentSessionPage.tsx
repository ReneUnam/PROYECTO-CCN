import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  Clock,
  CalendarClock,
  AlertCircle,
} from "lucide-react";
import {
  startAssignment,
  getAssignmentDetail,
  getSurveyQuestions,
  getSessionResponses,
  upsertResponse,
  completeSession,
} from "../api/assignmentsApi";
import { FullScreenLoader } from "@/components/FullScreenLoader";

type Q = { id: number; prompt: string };

export function AssignmentSessionPage() {
    const toast = useToast();
  const { assignmentId } = useParams();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();

  // Detectar solo lectura por parámetro de URL
  const [readOnly, setReadOnly] = useState(() => sp.get("readonly") === "1");

  useEffect(() => {
    setReadOnly(sp.get("readonly") === "1");
  }, [sp]);

  const [sessionId, setSessionId] = useState<string | null>(sp.get("session"));
  const [surveyId, setSurveyId] = useState<number | null>(null);
  const [surveyName, setSurveyName] = useState<string>("");
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<number, { text: string }>>({});
  const [index, setIndex] = useState(0);
  const timersRef = useRef<Record<number, number>>({});

  // Cargar detalles de asignación
  useEffect(() => {
    if (!assignmentId) return;
    getAssignmentDetail(Number(assignmentId))
      .then(({ survey_id, survey_name, end_at }) => {
        setSurveyId(survey_id);
        setSurveyName(survey_name);
        setDueAt(end_at ?? null);
      })
      .catch((e) => toast.error(e.message || "Error al cargar la asignación"));
  }, [assignmentId]);

  // Crear sesión si no existe (modo editable)
  useEffect(() => {
    if (!assignmentId || sessionId || readOnly) return;
    startAssignment(Number(assignmentId))
      .then((sid) => {
        setSessionId(sid);
        sp.set("session", sid);
        setSp(sp, { replace: true });
      })
      .catch((e) => toast.error(e.message || "Error al iniciar la sesión"));
  }, [assignmentId, sessionId, readOnly, sp, setSp]);

  // Cargar preguntas
  useEffect(() => {
    if (!surveyId) return;
    getSurveyQuestions(surveyId)
      .then(setQuestions)
      .catch((e) => console.error(e));
  }, [surveyId]);

  // Cargar respuestas de la sesión (lectura o edición)
  useEffect(() => {
    if (!sessionId) return;
    getSessionResponses(sessionId)
      .then((map) => {
        const obj: Record<number, { text: string }> = {};
        map.forEach((v, k) => {
          if (v == null) {
            obj[k] = { text: "" };
          } else if (typeof v === "string") {
            obj[k] = { text: v };
          } else if (typeof v === "object" && typeof v.text === "string") {
            obj[k] = { text: v.text };
          } else {
            obj[k] = { text: JSON.stringify(v) };
          }
        });
        setAnswers(obj);
      })
      .catch((e) => console.error(e));
  }, [sessionId]);

  const current = questions[index];
  const total = questions.length;

  async function persist(qid: number, value: { text: string }) {
    if (!sessionId) return;
    try {
      await upsertResponse({ sessionId, questionId: qid, value });
      setLastSavedAt(new Date().toISOString());
    } catch (e: any) {
      console.error("upsert_response error:", e?.message || e);
    }
  }

  function onChangeAnswer(qid: number, text: string) {
    if (readOnly) return;
    const value = { text };
    setAnswers((a) => ({ ...a, [qid]: value }));
    window.clearTimeout(timersRef.current[qid]);
    timersRef.current[qid] = window.setTimeout(() => persist(qid, value), 400);
  }

  // 'saveDraft' removed because auto-save handles persistence

  async function onSubmitAll() {
    if (readOnly || !sessionId) return;
    console.log("[DEBUG] Enviando respuestas para sesión:", sessionId, answers);
    await Promise.all(
      Object.entries(answers).map(([qid, val]) =>
        persist(Number(qid), val as { text: string })
      )
    );
    try {
      console.log("[DEBUG] Marcando sesión como completada:", sessionId);
      await completeSession(sessionId);
      toast.success("Respuestas enviadas. Verifica en la base de datos si la sesión tiene status 'completed'.");
      navigate("/questions");
    } catch (e: any) {
      toast.error(e.message || "No se pudo enviar");
    }
  }

  if (!surveyId || !total || !sessionId) return <FullScreenLoader />;

  if (readOnly) {
    // Vista solo lectura: lista vertical simple de preguntas y respuestas (diseño mejorado)
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-text bg-surface min-h-screen transition-colors dark:bg-surface">
        <div className="mb-8 relative">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              aria-label="Volver"
              className="inline-flex items-center justify-center rounded-md border border-border bg-surface p-2 text-sm hover:bg-muted dark:bg-surface dark:border-border"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 text-center">
              <h1 className="mx-auto text-xl font-semibold truncate dark:text-text">
                {surveyName || "Respuestas de la sesión"}
              </h1>
              <p className="mt-1 text-sm text-text/60">Visualización de respuestas · {questions.length} pregunta{questions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {questions.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-text/60 dark:bg-surface dark:border-border dark:text-text/60">
            Sin preguntas en esta sesión.
          </div>
        )}

        <div className="space-y-6">
          {questions.map((q, idx) => {
            const answered = !!answers[q.id]?.text?.trim();
            return (
              <div
                key={q.id}
                className="rounded-2xl border border-border bg-white p-6 shadow-md transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold leading-snug mb-2 text-text">{q.prompt}</h2>
                    <div className={answered ? "whitespace-pre-wrap text-[15px] text-text/90" : "italic text-text/50"}>
                      {answered ? answers[q.id]!.text : "(Sin respuesta)"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Modo editable
  return (
    <section className="mx-auto max-w-6xl text-text">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="rounded-md border border-border bg-surface px-2 py-1 hover:bg-muted"
              onClick={() => navigate(-1)}
              aria-label="Volver"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold">
                Responde: {surveyName || "Asignación"}
              </h1>
              <p className="text-xs text-text/70">Preguntas abiertas</p>
            </div>
          </div>
          <div className="min-w-[240px]">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span>Progreso</span>
              <span>
                {index + 1} / {total}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${((index + 1) / total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-[1fr_320px]">
        <div>
          <article className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <header className="mb-3 flex items-start gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h2 className="font-medium">{current.prompt}</h2>
            </header>
            <div className="space-y-2">
              <textarea
                rows={8}
                placeholder="Escribe tu respuesta aquí..."
                className="w-full resize-y rounded-lg border border-border bg-muted p-3 outline-none focus:ring-2 focus:ring-primary"
                value={answers[current.id]?.text ?? ""}
                onChange={(e) => onChangeAnswer(current.id, e.target.value)}
              />
              <div className="flex items-center justify-between text-xs text-text/70">
                <span>Sugerencia: 3–5 oraciones.</span>
              </div>
            </div>
          </article>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-text/70" />
              <h3 className="text-sm font-semibold">Detalles</h3>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-text/60" />
                <span>
                  <strong>Vencimiento:</strong>{" "}
                  {dueAt ? new Date(dueAt).toLocaleString() : "—"}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-text/60" /> Guardado
                automático
              </li>
              {lastSavedAt && (
                <li className="flex items-center gap-2 text-xs text-text/60">
                  Último guardado: {new Date(lastSavedAt).toLocaleString()}
                </li>
              )}
            </ul>
          </section>
        </aside>
      </div>

      {/* Barra inferior */}
      <div className="sticky bottom-0 border-t border-border bg-surface/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm hover:bg-muted/80 disabled:opacity-40"
            disabled={index === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <div className="flex items-center gap-2">
            {/* 'Guardar borrador' eliminado: se mantiene guardado automático */}
            {index < total - 1 ? (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmitAll}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-600/90"
              >
                <CheckCircle2 className="h-4 w-4" />
                Enviar respuestas
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}