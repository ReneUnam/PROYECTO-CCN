import { NavLink } from "react-router-dom";

export function Sidebar() {
  const links = [
    { label: "Inicio", path: "/dashboard" },
    { label: "Perfil", path: "/profile" },
    { label: "Diario", path: "/journal" },
    { label: "Preguntas", path: "/questions" },
    { label: "Buzón", path: "/forum" },
    { label: "Asistente virtual", path: "/chatbot" },
    { label: "Recursos", path: "/resources" },
    { label: "Bienestar", path: "/wellness" },
  ];

  return (
    <aside className="w-64 bg-surface text-text border-r border-border p-4 shadow-sm">
      <nav className="flex flex-col gap-2">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              [
                "px-3 py-2 rounded-md transition-colors",
                "hover:bg-brand-blue/10",
                isActive ? "bg-brand-blue/10 text-brand-blue font-semibold" : "text-text",
              ].join(" ")
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}