import { Link } from "react-router-dom";

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
          <p className="text-sm">Selecciona una tarjeta para continuar con tu siguiente actividad.</p>
        </header>

        {/* 2 columnas en md+ (2x2 para 4 items) con altura fija */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickActions.map((card) => (
            <Link
              key={card.id}
              to={card.route}
              className="group relative flex h-56 w-full flex-col justify-end overflow-hidden rounded-3xl bg-surface text-left shadow border border-border transition hover:-translate-y-1 hover:shadow-lg"
            >
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

      {/* Consejo del día */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm">
          Consejo del día: prioriza 10 minutos de respiración consciente.{" "}
          <span className="font-semibold text-brand-gold">Pequeños hábitos sostienen grandes cambios.</span>
        </p>
      </section>
    </section>
  );
}