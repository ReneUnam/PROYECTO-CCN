import { NavLink } from "react-router-dom";
import type { ComponentType } from "react";
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  Home,
  User,
  NotebookPen,
  HelpCircle,
  Inbox,
  Bot,
  BookOpen,
  Brain,
  BarChart3,
  CalendarCheck,
  Settings,
  Bell,
  LogOut,
} from "lucide-react";

type SidebarProps = {
  open: boolean;
  onClose?: () => void;
};

type LinkItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  // optional allowed roles (when set, only users with one of these roles will see the link)
  allowedRoles?: string[];
};

export function Sidebar({ open }: SidebarProps) {
  const links: LinkItem[] = [
    { label: "Inicio", path: "/dashboard", icon: Home },
    { label: "Perfil", path: "/profile", icon: User },
    { label: "Diario", path: "/journal", icon: NotebookPen },
    { label: "Preguntas", path: "/questions", icon: HelpCircle },
    { label: "Buzón", path: "/forum", icon: Inbox },
    { label: "Asistente virtual", path: "/chatbot", icon: Bot },
    // Nuevas secciones
    { label: "Recursos", path: "/resources", icon: BookOpen, allowedRoles: ["teacher"] },
    { label: "Bienestar", path: "/wellness", icon: Brain },
    { label: "Hábitos", path: "/habits", icon: CalendarCheck },
    { label: "Estadísticas", path: "/stats", icon: BarChart3 },
    { label: "Notificaciones", path: "/notifications", icon: Bell },
    { label: "Configuración", path: "/settings", icon: Settings },
  ];

  const { user } = useAuth();
  const role = user?.role ?? 'student';

  // Filter links by allowedRoles (if provided)
  const visibleLinks = links.filter((l) => !l.allowedRoles || l.allowedRoles.includes(role));

  const base =
    "bg-surface text-text border-r border-border shadow-sm overflow-y-auto";

  return (
    <aside
      aria-hidden={!open}
      className={[
        base,
        // fijo debajo del header
        "fixed left-0 top-16 bottom-0 z-40 w-64",
        // animación suave solo con transform (GPU)
        "transform-gpu will-change-transform transform transition-transform duration-200 ease-in-out",
        // cuando está cerrado no recibe clics
        open ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none",
      ].join(" ")}
    >
      <div className="flex h-full flex-col">
        <nav className="flex-1 p-4">
          <ul className="flex flex-col gap-2">
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.path}>
                  <NavLink
                    to={link.path}
                    className={({ isActive }) =>
                      [
                        "px-3 py-2 rounded-md transition-colors",
                        "flex items-center gap-2",
                        "hover:bg-brand-blue/10",
                        isActive ? "bg-brand-blue/10 text-brand-blue font-semibold" : "text-text",
                      ].join(" ")
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{link.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Botón inferior: Cerrar sesión */}
        <div className="p-4 border-t border-border">
          <button
            type="button"
            // TODO: agregar lógica de sign-out
            className="w-full px-3 py-2 rounded-md flex items-center gap-2 text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </aside>
  );
}