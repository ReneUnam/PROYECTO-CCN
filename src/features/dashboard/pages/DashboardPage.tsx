const quickActions = [
  {
    id: "surveys",
    title: "Diario emocional",
    description: "Encuestas rápidas para conocer tu estado de ánimo y experiencias diarias.",
    image: "https://images.unsplash.com/photo-1516321165247-4aa89a48be28",
  },
  {
    id: "questions",
    title: "Preguntas",
    description: "Expresa con libertad tus pensamientos o preocupaciones.",
    image: "https://images.unsplash.com/photo-1485217988980-11786ced9454",
  },
  {
    id: "forum",
    title: "Buzón",
    description: "Un espacio privado para compartir tus experiencias con nosotros.",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d",
  },
  {
    id: "chatbot",
    title: "Asistente virtual",
    description: "Habla con nuestro asistente emocional. Está aquí para escucharte.",
    image: "https://er.educause.edu/-/media/images/articles/2024/04/er24_041_headerart_1600x900.jpg"
  },
  { id: "resources", title: "Recursos", description: "Explora material recomendado." },
  { id: "wellness", title: "Bienestar", description: "Revisa tu progreso personal." },
];

const highlights = [
  { id: "mood", title: "Estado actual", value: "Equilibrado" },
  { id: "streak", title: "Racha de hábitos", value: "7 días" },
  { id: "sessions", title: "Sesiones completadas", value: "15" },
];

export function DashboardPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-10 text-text">
      {/* Hero con gradiente que sigue los tokens del tema */}
      <section className="rounded-3xl bg-gradient-to-r from-primary to-secondary p-6 text-white shadow-lg">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-white/70">
              ¡Bienvenido Usuario123!
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">
              Tu espacio personal de bienestar
            </h1>
            <p className="mt-3 max-w-lg text-sm text-white/80">
              Continúa con tus actividades y descubre herramientas personalizadas
              para mantener el equilibrio emocional cada día.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 md:w-auto">
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
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">Accesos rápidos</h2>
          <p className="text-sm">
            Selecciona una tarjeta para continuar con tu siguiente actividad.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((card) => (
            <button
              key={card.id}
              className="group relative flex h-40 w-full flex-col justify-end overflow-hidden rounded-3xl bg-surface text-left shadow border border-border transition hover:-translate-y-1 hover:shadow-lg"
            >
              {card.image && (
                <div
                  className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${card.image})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/40 dark:from-black/30 dark:to-black/60" />
              <div className="relative space-y-1 p-5 text-white">
                <p className="text-xs uppercase tracking-wide opacity-90">
                  {card.description}
                </p>
                <h3 className="text-lg font-semibold">{card.title}</h3>
              </div>
              <span className="absolute inset-x-0 bottom-0 h-1 bg-secondary" />
            </button>
          ))}
        </div>
      </section>

      {/* Consejo del día */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm">
          Consejo del día: prioriza 10 minutos de respiración consciente.{" "}
          <span className="font-semibold text-brand-gold">
            Pequeños hábitos sostienen grandes cambios.
          </span>
        </p>
      </section>
    </section>
  );
}