import { useMemo, useState } from "react";
import { ChevronLeft, Save, CheckCircle2 } from "lucide-react";
import { ChipToggle } from "@/features/journal/components/ChipToggle";
import { LikertScale } from "@/features/journal/components/LikertScale";

type EmotionGroup = {
  id: string;
  title: string;
  emoji: string;
  subtitle: string;
  options: { label: string; emoji: string }[];
};

const GROUPS: EmotionGroup[] = [
  {
    id: "emotions",
    title: "Emociones",
    emoji: "😊",
    subtitle: "Selecciona las emociones predominantes.",
    options: [
      { label: "Alegría", emoji: "😄" },
      { label: "Tristeza", emoji: "😢" },
      { label: "Ira", emoji: "😠" },
      { label: "Miedo", emoji: "😨" },
      { label: "Asco", emoji: "🤢" },
      { label: "Irritación", emoji: "😒" },
    ],
  },
  {
    id: "feelings",
    title: "Sentimientos",
    emoji: "💖",
    subtitle: "Marca los sentimientos que identifiques.",
    options: [
      { label: "Satisfacción", emoji: "😊" },
      { label: "Entusiasmo", emoji: "🤩" },
      { label: "Vergüenza", emoji: "😳" },
      { label: "Culpa", emoji: "😔" },
      { label: "Envidia", emoji: "😒" },
      { label: "Celos", emoji: "😤" },
      { label: "Amor", emoji: "🥰" },
      { label: "Melancolía", emoji: "🥺" },
      { label: "Confianza", emoji: "😌" },
    ],
  },
  {
    id: "sensations",
    title: "Sensaciones",
    emoji: "🧠",
    subtitle: "Describe sensaciones físicas o mentales.",
    options: [
      { label: "Tranquilo", emoji: "😌" },
      { label: "Inquieto", emoji: "😬" },
      { label: "Nervioso", emoji: "😰" },
      { label: "Temeroso", emoji: "😱" },
      { label: "Soledad", emoji: "😶‍🌫️" },
      { label: "Abatido", emoji: "😞" },
    ],
  },
];

export function JournalEmotionSessionPage() {
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [intensity, setIntensity] = useState<number | undefined>();
  const toggleOption = (groupId: string, label: string) => {
    setSelected((prev) => {
      const next = new Set(prev[groupId] ?? []);
      next.has(label) ? next.delete(label) : next.add(label);
      return { ...prev, [groupId]: next };
    });
  };
  const totalSelected = useMemo(
    () => Object.values(selected).reduce((acc, set) => acc + set.size, 0),
    [selected]
  );

  return (
    <section className="mx-auto max-w-6xl text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
        <div className="flex items-center justify-between gap-3">
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold">Diario emocional</h1>
            <p className="text-xs text-text/70">
              Emojis y escalas para registrar el estado actual. Seleccionadas: {totalSelected}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-4">
        {GROUPS.map((group) => {
          const set = selected[group.id] ?? new Set<string>();
          return (
            <section key={group.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{group.emoji}</span>
                <div>
                  <h2 className="text-sm font-semibold">{group.title}</h2>
                  <p className="text-xs text-text/70">{group.subtitle}</p>
                  <p className="text-[11px] text-text/60 mt-1">{set.size} seleccionadas</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {group.options.map((opt) => (
                  <ChipToggle
                    key={opt.label}
                    label={
                      <span className="flex items-center gap-1">
                        <span>{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </span>
                    }
                    selected={set.has(opt.label)}
                    onClick={() => toggleOption(group.id, opt.label)}
                    className="px-3 py-2"
                  />
                ))}
              </div>
            </section>
          );
        })}

        <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Intensidad general</h2>
          <p className="text-xs text-text/70 mb-3">
            ¿Qué tan intensas fueron tus emociones durante el día?
          </p>
          <LikertScale
            name="emotion-intensity"
            value={intensity}
            onChange={setIntensity}
            labels={["Muy baja", "Baja", "Moderada", "Alta", "Muy alta"]}
          />
        </section>

        <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Notas</h2>
          <textarea
            rows={4}
            className="mt-3 w-full rounded-lg border border-border bg-muted/60 p-3 text-sm outline-none ring-primary/30 focus:ring"
            placeholder="Describe situaciones o detonantes importantes..."
          />
        </section>
      </div>

      <footer className="sticky bottom-0 border-t border-border bg-surface/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-2">
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-muted">
            <Save className="h-4 w-4" />
            Guardar borrador
          </button>
          <button className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-600/90">
            <CheckCircle2 className="h-4 w-4" />
            Finalizar
          </button>
        </div>
      </footer>
    </section>
  );
}