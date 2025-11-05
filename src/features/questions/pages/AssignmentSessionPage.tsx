import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CheckCircle2, Save, Clock, User, CalendarClock, AlertCircle, HelpCircle } from "lucide-react";
import { startAssignment, getAssignmentDetail, getSurveyQuestions, getSessionResponses, upsertResponse, completeSession } from "@/features/questions/api/assignmentsApi";

type Q = { id: number; prompt: string };

export function AssignmentSessionPage() {
  const { assignmentId } = useParams();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState<string | null>(sp.get("session"));
  const [surveyId, setSurveyId] = useState<number | null>(null);
  const [surveyName, setSurveyName] = useState<string>("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!assignmentId) return;
    getAssignmentDetail(Number(assignmentId))
      .then(({ survey_id, survey_name }) => {
        setSurveyId(survey_id);
        setSurveyName(survey_name);
      })
      .catch((e) => alert(e.message));
  }, [assignmentId]);

  useEffect(() => {
    if (!assignmentId || sessionId) return;
    startAssignment(Number(assignmentId))
      .then((sid) => { setSessionId(sid); sp.set("session", sid); setSp(sp, { replace: true }); })
      .catch((e) => alert(e.message));
  }, [assignmentId, sessionId, sp, setSp]);

  useEffect(() => { if (!surveyId) return; getSurveyQuestions(surveyId).then(setQuestions).catch(()=>{}); }, [surveyId]);

  useEffect(() => {
    if (!sessionId) return;
    getSessionResponses(sessionId).then((map) => {
      const obj: Record<number, any> = {}; map.forEach((v,k)=>obj[k]=v); setAnswers(obj);
    }).catch(()=>{});
  }, [sessionId]);

  const current = questions[index];
  const total = questions.length;

  const onChangeAnswer = async (qid: number, text: string) => {
    setAnswers((a) => ({ ...a, [qid]: { text } }));
    if (sessionId) await upsertResponse({ sessionId, questionId: qid, value: { text } }).catch(()=>{});
  };

  const onSubmitAll = async () => {
    if (!sessionId) return;
    await completeSession(sessionId).catch((e)=>alert(e.message));
    alert("Respuestas enviadas");
    navigate("/questions");
  };

  if (!current) return <div className="p-6 text-text">Cargando…</div>;

  return (
    <section className="mx-auto max-w-6xl text-text">
      <div className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="rounded-md border border-border bg-surface px-2 py-1 hover:bg-muted" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold">Responde: {surveyName || "Asignación"}</h1>
              <p className="text-xs text-text/70">Preguntas abiertas</p>
            </div>
          </div>
          <div className="min-w-[260px]">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span>Progreso</span><span>{index + 1} / {total}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

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
                <span>{(answers[current.id]?.text ?? "").length}/1000</span>
              </div>
            </div>
          </article>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-text/70" /><h3 className="text-sm font-semibold">Detalles</h3></div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><User className="h-4 w-4 text-text/60" />Profesor: —</li>
              <li className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-text/60" />Entrega: —</li>
              <li className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-text/60" />Guardado automático</li>
            </ul>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-surface/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm hover:bg-muted/80">
            <ChevronLeft className="h-4 w-4" />Anterior
          </button>
          <div className="flex items-center gap-2">
            <button type="button"
                    onClick={() => sessionId && upsertResponse({ sessionId, questionId: current.id, value: answers[current.id] ?? { text: "" } })}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-muted">
              <Save className="h-4 w-4" />Guardar borrador
            </button>
            {index < total - 1 ? (
              <button type="button" onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90">
                Siguiente<ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={onSubmitAll}
                      className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-600/90">
                <CheckCircle2 className="h-4 w-4" />Enviar respuestas
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}