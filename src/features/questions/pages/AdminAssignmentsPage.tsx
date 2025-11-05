import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSurveyWithQuestionsAndAssign } from "../api/assignmentsApi";

export default function AdminAssignmentsPage() {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState<string>(() => new Date(Date.now() + 24*60*60*1000).toISOString().slice(0,16)); // mañana
  const [questions, setQuestions] = useState<string[]>([""]);
  const [audience, setAudience] = useState<"all"|"students"|"teachers">("all");
  const [loading, setLoading] = useState(false);

  const addQ = () => setQuestions(q => [...q, ""]);
  const setQ = (i: number, v: string) => setQuestions(q => q.map((x, idx) => idx===i ? v : x));
  const rmQ = (i: number) => setQuestions(q => q.filter((_, idx) => idx!==i));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qs = questions.map(q => q.trim()).filter(Boolean);
    if (!title.trim() || !qs.length) return alert("Completa título y al menos una pregunta");
    setLoading(true);
    try {
      await createSurveyWithQuestionsAndAssign({
        title: title.trim(),
        dueAt: new Date(dueAt).toISOString(),
        questions: qs,
        audience,
      });
      alert("Sesión creada y asignada");
      setTitle("");
      setQuestions([""]);
    } catch (err: any) {
      alert(err.message || "No se pudo crear la asignación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 text-text">
      <h1 className="text-2xl font-semibold">Nueva sesión de preguntas</h1>

      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-surface p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="mb-1 block text-text/80">Título</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Reflexión semanal" />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-text/80">Vence (fecha y hora)</span>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2"
            />
          </label>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Audiencia</span>
          <div className="flex gap-2">
            {(["all","students","teachers"] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setAudience(v)}
                className={`rounded-lg px-3 py-1.5 text-sm border ${audience===v ? "bg-primary text-white" : "border-border bg-surface"}`}
              >
                {v === "all" ? "Todos" : v === "students" ? "Estudiantes" : "Docentes"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Preguntas abiertas</span>
            <Button type="button" variant="outline" onClick={addQ}>Agregar pregunta</Button>
          </div>

          {questions.map((q, i) => (
            <div key={i} className="rounded-xl border border-border bg-muted p-3">
              <textarea
                rows={3}
                value={q}
                onChange={(e) => setQ(i, e.target.value)}
                placeholder={`Pregunta #${i+1}`}
                className="w-full resize-y rounded-md border border-border bg-surface p-2 outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="mt-2 flex justify-end">
                <button type="button" className="text-sm text-text/70 hover:text-text" onClick={() => rmQ(i)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>

        <Button type="submit" disabled={loading}>{loading ? "Creando…" : "Crear y publicar"}</Button>
      </form>
    </div>
  );
}