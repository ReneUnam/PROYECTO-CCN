import { useState } from "react";
import {
    ChevronLeft,
    Save,
    CheckCircle2,
    Activity,
    Bed,
    Dumbbell,
    Droplets,
    Sparkles,
    Smile,
} from "lucide-react";
import { ChipToggle } from "@/features/journal/components/ChipToggle";
import { LikertScale } from "@/features/journal/components/LikertScale";

const CHECK_GROUPS = [
    {
        id: "sleep",
        title: "Sueño",
        icon: <Bed className="h-4 w-4" />,
        options: ["Dormí suficiente", "Dormí poco", "Dormí mal", "Me desperté descansado/a", "Me desperté cansado/a"],
    },
    {
        id: "activity",
        title: "Actividad física",
        icon: <Dumbbell className="h-4 w-4" />,
        options: ["Hice ejercicio", "Caminé", "Me moví poco", "Descansé"],
    },
    {
        id: "nutrition",
        title: "Alimentación",
        icon: <Droplets className="h-4 w-4" />,
        options: ["Comí saludable", "Comí demasiado", "Comí poco", "Bebí suficiente agua"],
    },
    {
        id: "emotional-care",
        title: "Autocuidado emocional",
        icon: <Sparkles className="h-4 w-4" />,
        options: ["Medité / Respiré", "Tiempo para mí", "Hablé con alguien", "Evité redes/noticias", "Hice algo que disfruto"],
    },
];

export function JournalSelfCareSessionPage() {
    const [energy, setEnergy] = useState<number | undefined>();
    const [dayScore, setDayScore] = useState<number | undefined>();
    const [selected, setSelected] = useState<Record<string, Set<string>>>({});

    const toggle = (groupId: string, option: string) => {
        setSelected((prev) => {
            const set = new Set(prev[groupId] ?? []);
            set.has(option) ? set.delete(option) : set.add(option);
            return { ...prev, [groupId]: set };
        });
    };

    return (
        <section className="mx-auto max-w-6xl text-text">
            <header className="sticky top-0 z-10 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
                <div className="flex items-center justify-between gap-3">
                    <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-base font-semibold">Diario de autocuido</h1>
                        <p className="text-xs text-text/70">Registra energía, hábitos y calificación del día.</p>
                    </div>
                </div>
            </header>

            <div className="space-y-6 p-4">
                <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <Activity className="h-4 w-4 text-primary" />
                        Energía física
                    </div>
                    <p className="text-xs text-text/70 mb-3">Selecciona el nivel de energía general.</p>
                    <LikertScale
                        name="energy"
                        value={energy}
                        onChange={setEnergy}
                        labels={["Muy baja", "Baja", "Media", "Alta", "Muy alta"]}
                    />
                </section>

                {CHECK_GROUPS.map((group) => {
                    const set = selected[group.id] ?? new Set<string>();
                    return (
                        <section key={group.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                {group.icon}
                                {group.title}
                            </div>
                            <p className="text-xs text-text/70 mb-3">Selecciona todo lo que aplicó hoy.</p>
                            <div className="flex flex-wrap gap-2">
                                {group.options.map((opt) => (
                                    <ChipToggle
                                        key={opt}
                                        label={opt}
                                        selected={set.has(opt)}
                                        onClick={() => toggle(group.id, opt)}
                                    />
                                ))}
                            </div>
                        </section>
                    );
                })}

                <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <Smile className="h-4 w-4 text-primary" />
                        Auto calificación del día
                    </div>
                    <p className="text-xs text-text/70 mb-3">Evalúa el día en general.</p>
                    <LikertScale
                        name="day-score"
                        value={dayScore}
                        onChange={setDayScore}
                        labels={["Muy malo", "Malo", "Regular", "Bueno", "Excelente"]}
                    />
                </section>

                <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                    <h2 className="text-sm font-semibold">Notas</h2>
                    <textarea
                        rows={4}
                        className="mt-3 w-full rounded-lg border border-border bg-muted/60 p-3 text-sm outline-none ring-primary/30 focus:ring"
                        placeholder="Agrega detalles, logros o retos del día..."
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