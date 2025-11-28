import { Link } from "react-router-dom";
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PendingAssignments } from "@/features/questions/components/PendingAssignments";
import { useEffect, useMemo, useState } from "react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { supabase } from "@/core/api/supabaseClient";
import { getMyStreakAll } from "@/features/journal/api/journalApi";
import { getStreak } from "@/features/journal/api/journalApi";

const quickActions = [
  {
    id: "surveys",
    title: "Diario emocional",
    description: "Encuestas rápidas para conocer tu estado de ánimo y experiencias diarias.",
    image: "https://imgproxy.domestika.org/unsafe/w:1200/rs:fill/plain/src://blog-post-open-graph-covers/000/008/080/8080-original.jpg?1623945060",
    route: "/journal",
  },
  {
    id: "questions",
    title: "Preguntas",
    description: "Expresa con libertad tus pensamientos o preocupaciones.",
    image: "https://pablotovar.com/wp-content/uploads/2021/10/10-preguntas-para-mejorar-tu-vida.png",
    route: "/questions",
  },
  {
    id: "forum",
    title: "Buzón",
    description: "Un espacio privado para compartir tus experiencias con nosotros.",
    image: "https://i.ytimg.com/vi/VOcK7YbaL_M/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBL0FF8P3UqO2aqm6KROqQHun2qTQ",
    route: "/forum",
  },
  {
    id: "chatbot",
    title: "Asistente virtual",
    description: "Habla con nuestro asistente emocional. Está aquí para escucharte.",
    image: "https://er.educause.edu/-/media/images/articles/2024/04/er24_041_headerart_1600x900.jpg",
    route: "/chatbot",
  },
  {
    id: 'materials',
    title: 'Materiales',
    description: 'Recursos pedagógicos y documentos',
    image: 'https://img.freepik.com/free-photo/still-life-documents-stack_23-2151088805.jpg',
    route: '/resources',
    // allowed solo para role_id 2 (teacher)
    allowedRoleIds: [1, 2],
  },
];


export function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [streakEmo, setStreakEmo] = useState<number | null>(null);
  const [streakSelf, setStreakSelf] = useState<number | null>(null);
  const [journalStreak, setJournalStreak] = useState<number | null>(null);
  const [answeredToday, setAnsweredToday] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;
    (async () => {
      try {
        const [a, b, streaks, answered] = await Promise.all([
          getStreak("emotions"),
          getStreak("self-care"),
          getMyStreakAll().catch(() => []),
          supabase.rpc("my_answered_questions_today"),
        ]);
        if (!mounted) return;
        setStreakEmo(a.current_streak ?? 0);
        setStreakSelf(b.current_streak ?? 0);
        setJournalStreak(Math.max(0, ...streaks.map((s: any) => s.current_streak ?? 0)));
        setAnsweredToday(!answered.error ? Number(answered.data) || 0 : 0);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [authLoading, user]);

  const roleId = user?.role_id ?? 3; // 1=admin,2=teacher,3=student
  const isAdmin = roleId === 1;
  const displayName = user?.full_name ?? 'Usuario';
  const isTeacher = roleId === 2;
  const visibleActions = quickActions.filter(a => isAdmin || !a.allowedRoleIds || a.allowedRoleIds.includes(roleId)).filter(a => !isTeacher || (a.id !== 'surveys' && a.id !== 'chatbot'));
  const cardSizeClass = isTeacher ? 'h-72 md:h-80' : 'h-56';

  const highlights = [
    { id: "selfStreak", title: "Constancia del diario de autocuido", value: streakSelf != null ? `${streakSelf} día${streakSelf === 1 ? '' : 's'}` : "-" },
    { id: "emoStreak", title: "Constancia del diario emocional", value: streakEmo != null ? `${streakEmo} día${streakEmo === 1 ? '' : 's'}` : "-" },
    { id: "answers", title: "Preguntas contestadas hoy", value: answeredToday != null ? String(answeredToday) : "-" },
  ];

  const tips = [
    { text: 'Prioriza 10 minutos de respiración consciente.', highlight: 'Pequeños hábitos sostienen grandes cambios.' },
    { text: 'Toma agua regularmente para mantenerte hidratado.', highlight: 'La hidratación mejora el ánimo y la concentración.' },
    { text: 'Haz una caminata corta de 15 minutos.', highlight: 'El movimiento despeja la mente.' },
    { text: 'Escribe tres cosas por las que estás agradecido hoy.', highlight: 'La gratitud cambia la perspectiva.' },
    { text: 'Practica 5 minutos de atención plena.', highlight: 'La calma se practica, no aparece por arte de magia.' },
    { text: 'Comparte una sonrisa con alguien.', highlight: 'Pequeños gestos crean conexiones.' },
  ];

  const tipOfDay = useMemo(() => {
    const days = Math.floor(Date.now() / 86400000);
    return tips[days % tips.length];
  }, []);

  if (authLoading || loading || !user) return <FullScreenLoader />;

  return (
    <section className="mx-auto max-w-6xl space-y-10 text-text">
      <section className="rounded-3xl bg-gradient-to-r from-primary to-secondary p-6 text-white shadow-lg">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-white/70">
              ¡Bienvenido {displayName}!
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">
              Tu espacio personal de bienestar
            </h1>
            <p className="mt-3 max-w-lg text-sm text-white/80">
              Continúa con tus actividades y descubre herramientas personalizadas
              para mantener el equilibrio emocional cada día.
            </p>
          </div>

          <div className={`grid w-full grid-cols-1 gap-3 ${isTeacher ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} md:w-auto`}>
            {highlights.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl bg-white/20 p-4 text-center backdrop-blur dark:bg-black/20"
              >
                <p className="text-xs uppercase tracking-wide">{item.title}</p>
                <p className="text-xl font-semibold">{item.value}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Accesos rápidos */}
      <section className="space-y-6">
        <PendingAssignments />
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">Accesos rápidos</h2>
          <p className="text-sm">Selecciona una tarjeta para continuar con tu siguiente actividad.</p>
        </header>

        <div className={`grid grid-cols-1 ${isTeacher ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
          {visibleActions.map((card) => (
            <Link
              key={card.id}
              to={card.route}
              className={`group relative flex ${cardSizeClass} w-full flex-col justify-end overflow-hidden rounded-3xl bg-surface text-left shadow border border-border transition hover:-translate-y-1 hover:shadow-lg`}
            >
              {/* ...existing code... */}
              {card.image && (
                <div
                  className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${card.image})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/40 dark:from-black/30 dark:to-black/60" />
              <div className="relative space-y-1 p-5 text-white">
                <p className="text-xs uppercase tracking-wide opacity-90">{card.description}</p>
                <h3 className="text-lg font-semibold">{card.title}</h3>
              </div>
              <span className="absolute inset-x-0 bottom-0 h-1 bg-secondary" />
            </Link>
          ))}
        </div>
      </section>

      {/* Consejo del día dinámico */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm">
          Consejo del día: {tipOfDay.text}{' '}
          <span className="font-semibold text-brand-gold">{tipOfDay.highlight}</span>
        </p>
      </section>
    </section>
  );
}