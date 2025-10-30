import { CalendarDays, Edit2, Mail, MapPin, Phone, Smile, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ProfilePage() {
    return (
        <section className="mx-auto max-w-5xl space-y-6 text-text">
            <header className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
                {/* <div className="absolute inset-x-0 top-0 h-36 rounded-t-3xl bg-gradient-to-r from-primary/85 via-primary to-primary/80" /> */}
                <div className="rounded-2xl bg-surface/95 px-4 py-4 shadow-lg ring-1 ring-black/5 backdrop-blur">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                        <Avatar className="h-28 w-28 border-4 border-surface shadow-lg">
                            <AvatarImage src="https://i.pravatar.cc/200" alt="Usuario" />
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <h1 className="text-xl font-semibold">Renée González</h1>
                            <p className="text-sm text-text/70">Estudiante · 3° Secundaria · Grupo 2A</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-text/60">
                                <span className="inline-flex items-center gap-1">
                                    <CalendarDays className="h-3.5 w-3.5" /> Miembro desde sep 2023
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Trophy className="h-3.5 w-3.5 text-amber-500" /> Racha bienestar: 7 días
                                </span>
                            </div>
                        </div>
                        <button className="ml-auto inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-muted">
                            <Edit2 className="h-4 w-4" /> Editar perfil
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-border bg-surface p-4">
                    <h2 className="text-sm font-semibold">Contacto</h2>
                    <ul className="mt-3 space-y-2 text-sm text-text/70">
                        <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> renee@correo.com</li>
                        <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +52 55 1234 5678</li>
                        <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Ciudad de México</li>
                    </ul>
                </article>

                <article className="rounded-2xl border border-border bg-surface p-4">
                    <h2 className="text-sm font-semibold">Estado actual</h2>
                    <div className="mt-3 space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-text/70">
                                <Smile className="h-4 w-4 text-emerald-500" /> Bienestar promedio
                            </span>
                            <span className="font-semibold text-emerald-600">4.3 / 5</span>
                        </div>
                        <div>
                            <p className="text-xs text-text/60">Última actualización hoy 10:15</p>
                            <div className="mt-2 h-2 rounded-full bg-muted">
                                <div className="h-full w-[70%] rounded-full bg-primary" />
                            </div>
                        </div>
                    </div>
                </article>

                <article className="rounded-2xl border border-border bg-surface p-4">
                    <h2 className="text-sm font-semibold">Próximos pasos</h2>
                    <ul className="mt-3 space-y-2 text-sm text-text/70">
                        <li className="rounded-lg bg-muted/70 px-3 py-2">Completa el diario emocional de hoy</li>
                        <li className="rounded-lg bg-muted/70 px-3 py-2">2 preguntas abiertas pendientes</li>
                    </ul>
                </article>
            </div>

            <section className="rounded-2xl border border-border bg-surface p-4">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-sm font-semibold">Resumen emocional</h2>
                        <p className="text-xs text-text/70">Promedios de los últimos 14 días</p>
                    </div>
                    <button className="text-xs text-primary hover:underline">Ver estadísticas</button>
                </header>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
                        <h3 className="font-medium">Emociones predominantes</h3>
                        <ul className="mt-2 space-y-1 text-text/70">
                            <li>😊 Alegría · 42%</li>
                            <li>😔 Culpa · 18%</li>
                            <li>😬 Inquieto · 16%</li>
                        </ul>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
                        <h3 className="font-medium">Autocuidado</h3>
                        <ul className="mt-2 space-y-1 text-text/70">
                            <li>Energía física: alta (4.0)</li>
                            <li>Sueño: dormí suficiente 5 veces</li>
                            <li>Actividad: ejercicio 3 veces</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-4">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-sm font-semibold">Historial reciente</h2>
                        <p className="text-xs text-text/70">Últimas interacciones en la plataforma</p>
                    </div>
                    <button className="text-xs text-primary hover:underline">Ver todo</button>
                </header>
                <div className="mt-4 divide-y divide-border text-sm text-text/70">
                    <div className="flex items-center justify-between py-3">
                        <span>Diario de autocuido completado</span>
                        <span className="text-xs text-text/60">Hoy · 10:05</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                        <span>Pregunta “¿Cómo te sentiste hoy?” enviada</span>
                        <span className="text-xs text-text/60">Ayer · 18:40</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                        <span>Objetivo “Dormir 8h” marcado como cumplido</span>
                        <span className="text-xs text-text/60">26 oct · 21:15</span>
                    </div>
                </div>
            </section>
        </section>
    );
}