// Reemplaza el selector combinado por campos separados (fecha y hora) más cómodos en móvil.
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSurveyWithQuestionsAndAssign } from "../api/assignmentsApi";

function pad2(n: number) { return String(n).padStart(2, "0"); }
function oneMonthFromNowLocal() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

export default function AdminAssignmentsPage() {
  const [title, setTitle] = useState("");
  const init = oneMonthFromNowLocal();
  const [dueDate, setDueDate] = useState(init.date); // YYYY-MM-DD
  const [dueTime, setDueTime] = useState(init.time); // HH:mm
  const [questions, setQuestions] = useState<string[]>([""]);
  const [audience, setAudience] = useState<"all" | "students" | "teachers">("all");
  const [loading, setLoading] = useState(false);

  const addQ = () => setQuestions((q) => [...q, ""]);
  const setQ = (i: number, v: string) => setQuestions((q) => q.map((x, idx) => (idx === i ? v : x)));
  const rmQ = (i: number) => setQuestions((q) => q.filter((_, idx) => idx !== i));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qs = questions.map((q) => q.trim()).filter(Boolean);
    if (!title.trim() || !qs.length) return alert("Completa título y al menos una pregunta");
    setLoading(true);
    try {
      const due = new Date(`${dueDate}T${dueTime}`);
      await createSurveyWithQuestionsAndAssign({
        title: title.trim(),
        dueAt: due.toISOString(),
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
    <div className="mx-auto max-w-3xl space-y-6 px-4 text-[color:var(--color-text)]">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Nueva sesión de preguntas</h1>
        <p className="text-sm text-[color:var(--color-text)]/70">
          Define el título, audiencia y preguntas abiertas que recibirán los usuarios seleccionados.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/70 p-6 shadow-xl backdrop-blur"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-[color:var(--color-text)]/80">Título</span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Reflexión semanal"
              className="w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-4 py-3 text-[color:var(--color-text)] placeholder:text-[color:var(--color-text)]/50 focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/40"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm col-span-1">
              <span className="mb-1 block text-[color:var(--color-text)]/80">Fecha</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onClick={(e: any) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                className="w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-4 py-3 text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/40"
              />
            </label>

            <label className="text-sm col-span-1">
              <span className="mb-1 block text-[color:var(--color-text)]/80">Hora</span>
              <input
                type="time"
                step={60}
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                onClick={(e: any) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                className="w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-4 py-3 text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/40"
              />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--color-text)]/90">Audiencia</span>
          <div className="flex flex-wrap gap-2">
            {(["all", "students", "teachers"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAudience(v)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  audience === v
                    ? "bg-[color:var(--color-primary)] text-white"
                    : "border border-[color:var(--color-border)] bg-[color:var(--color-muted)] text-[color:var(--color-text)] hover:bg-[color:var(--color-muted)]/80"
                }`}
              >
                {v === "all" ? "Todos" : v === "students" ? "Estudiantes" : "Docentes"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-[color:var(--color-text)]/90">Preguntas abiertas</span>
            <Button
              type="button"
              variant="outline"
              onClick={addQ}
              className="rounded-full border-none bg-[color:var(--color-muted)] text-sm hover:bg-[color:var(--color-muted)]/80"
            >
              Agregar pregunta
            </Button>
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/70 p-4"
              >
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-text)]/60">
                  Pregunta #{i + 1}
                </label>
                <textarea
                  rows={4}
                  value={q}
                  onChange={(e) => setQ(i, e.target.value)}
                  placeholder="Describe la actividad o tema a responder…"
                  className="w-full resize-y rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-[color:var(--color-text)] placeholder:text-[color:var(--color-text)]/50 focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/40"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="text-sm text-[color:var(--color-text)]/60 hover:text-[color:var(--color-text)]"
                    onClick={() => rmQ(i)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[color:var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[color:var(--color-primary)]/25 hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Creando…" : "Crear y publicar"}
          </Button>
        </div>
      </form>
    </div>
  );
}