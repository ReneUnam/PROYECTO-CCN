import { useState } from "react";
import { NotebookPen, Save, CheckCircle2 } from "lucide-react";
import { LikertRowList } from "@/features/journal/components/LikertRowList";

type Item = { id: string; prompt: string; helper?: string };

const ITEMS: Item[] = [
  { id: "i1", prompt: "¿Cómo te sientes en este momento?" },
  { id: "i2", prompt: "Nivel de energía actual." },
  { id: "i3", prompt: "¿Qué tan estresado(a) te sientes?" },
  { id: "i4", prompt: "¿Cómo estuvo tu concentración hoy?" },
  { id: "i5", prompt: "¿Cómo calificas tus interacciones con otras personas?" },
  { id: "i6", prompt: "¿Cómo estuvo tu sueño anoche?" },
];

export function JournalEntryPage() {
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});

  return (
    <section className="mx-auto max-w-6xl text-text">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <NotebookPen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Diario emocional</h1>
            <p className="text-xs text-text/70">Pregunta arriba, opciones abajo (G–M–N–M–G)</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <LikertRowList
          items={ITEMS}
          answers={answers}
          onChange={(id: any, v: any) => setAnswers((s) => ({ ...s, [id]: v }))}
        />
      </div>

      <div className="sticky bottom-0 border-t border-border bg-surface/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-2">
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-muted">
            <Save className="h-4 w-4" /> Guardar borrador
          </button>
          <button className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-600/90">
            <CheckCircle2 className="h-4 w-4" /> Finalizar
          </button>
        </div>
      </div>
    </section>
  );
}