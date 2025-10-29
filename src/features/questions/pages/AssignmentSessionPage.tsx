import { useState } from "react";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Save,
  Clock, User, CalendarClock, AlertCircle, HelpCircle,
} from "lucide-react";

type Question = { id: string; prompt: string; helper?: string };

const QUESTIONS: Question[] = [
  { id: "q1", prompt: "¿Cómo te sentiste hoy? Describe las emociones que predominan en ti.", helper: "Piensa en situaciones específicas que hayan influido." },
  { id: "q2", prompt: "¿Qué evento del día impactó más tu estado de ánimo y por qué?" },
  { id: "q3", prompt: "Cuando te sentiste incómodo(a), ¿qué hiciste para regular tus emociones?" },
  { id: "q4", prompt: "Menciona algo por lo que te sientas agradecido(a) hoy." },
  { id: "q5", prompt: "Si pudieras repetir el día, ¿qué harías diferente respecto a tus emociones?" },
  { id: "q6", prompt: "¿Qué apoyo te gustaría recibir para sentirte mejor?" },
];

export function AssignmentSessionPage() {
  const [index, setIndex] = useState(0);
  const total = QUESTIONS.length;
  const current = QUESTIONS[index];

  return (
    <section className="mx-auto max-w-6xl text-text">
      <div className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="rounded-md border border-border bg-surface px-2 py-1 hover:bg-muted">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold">Responde la asignación</h1>
              <p className="text-xs text-text/70">Preguntas abiertas asignadas por tu profesor</p>
            </div>
          </div>
          <div className="min-w-[260px]">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span>Progreso</span>
              <span>{index + 1} / {total}</span>
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
              <div>
                <h2 className="font-medium">{current.prompt}</h2>
                {current.helper && <p className="mt-1 text-sm text-text/70">{current.helper}</p>}
              </div>
            </header>

            <div className="space-y-2">
              <textarea rows={8} placeholder="Escribe tu respuesta aquí..." className="w-full resize-y rounded-lg border border-border bg-muted p-3 outline-none ring-primary/30 focus:ring" />
              <div className="flex items-center justify-between text-xs text-text/70">
                <span>Sugerencia: 3–5 oraciones.</span>
                <span>0/1000</span>
              </div>
            </div>
          </article>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-text/70" />
              <h3 className="text-sm font-semibold">Detalles de la asignación</h3>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><User className="h-4 w-4 text-text/60" />Profesor: <span className="ml-1 font-medium">M. García</span></li>
              <li className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-text/60" />Entrega: <span className="ml-1 font-medium">Vie 18:00</span></li>
              <li className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-text/60" />Intentos: <span className="ml-1">1 (continuo)</span></li>
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4">
            <h4 className="mb-2 text-sm font-semibold">Instrucciones</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-text/80">
              <li>Responde con sinceridad y en tus propias palabras.</li>
              <li>Puedes guardar borrador antes de enviar.</li>
              <li>Al finalizar, revisa y envía tus respuestas.</li>
            </ul>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-surface/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} className="inline-flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm hover:bg-muted/80">
            <ChevronLeft className="h-4 w-4" />Anterior
          </button>
          <div className="flex items-center gap-2">
            <button type="button" className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-muted">
              <Save className="h-4 w-4" />Guardar borrador
            </button>
            {index < total - 1 ? (
              <button type="button" onClick={() => setIndex((i) => Math.min(total - 1, i + 1))} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90">
                Siguiente<ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-600/90">
                <CheckCircle2 className="h-4 w-4" />Enviar respuestas
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}