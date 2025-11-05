import { NavLink, useNavigate } from "react-router-dom";
import { useState, type ComponentType } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
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
  ChevronDown,
  ShieldCheck,
  ListChecks,
  ClipboardList,
} from "lucide-react";
import { supabase } from "../api/supabaseClient";

type SidebarProps = {
  open: boolean;
  onClose?: () => void;
};

type LinkItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  allowedRoleIds?: number[];
};

export function Sidebar({ open }: SidebarProps) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const links: LinkItem[] = [
    { label: "Inicio", path: "/dashboard", icon: Home },
    { label: "Perfil", path: "/profile", icon: User },
    { label: "Diario", path: "/journal", icon: NotebookPen },
    { label: "Preguntas", path: "/questions", icon: HelpCircle },
    { label: "Buzón", path: "/forum", icon: Inbox },
    { label: "Asistente virtual", path: "/chatbot", icon: Bot },
    { label: "Recursos", path: "/resources", icon: BookOpen, allowedRoleIds: [2] },
    { label: "Bienestar", path: "/wellness", icon: Brain },
    { label: "Hábitos", path: "/habits", icon: CalendarCheck },
    { label: "Estadísticas", path: "/stats", icon: BarChart3 },
    { label: "Notificaciones", path: "/notifications", icon: Bell },
    { label: "Configuración", path: "/settings", icon: Settings },
  ];

  const { user } = useAuth();
  const roleId = user?.role_id ?? 3;
  const isAdmin = roleId === 1;

  const visibleLinks = links.filter(
    (l) => isAdmin || !l.allowedRoleIds || l.allowedRoleIds.includes(roleId)
  );

  const homeLink = visibleLinks.find((l) => l.path === "/dashboard");
  const otherLinks = visibleLinks.filter((l) => l.path !== "/dashboard");

  const base = "bg-surface text-text border-r border-border shadow-sm overflow-y-auto";

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await supabase.auth.signOut({ scope: "local" as any });
      navigate("/login", { replace: true });
      setTimeout(() => window.location.reload(), 50);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <aside
      aria-hidden={!open}
      className={[
        base,
        "fixed left-0 top-16 bottom-0 z-40 w-64",
        "transform-gpu will-change-transform transform transition-transform duration-200 ease-in-out",
        open ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none",
      ].join(" ")}
    >
      <div className="flex h-full flex-col">
        <nav className="flex-1 p-4">
          <ul className="flex flex-col gap-2">
            {/* 1) Inicio */}
            {homeLink && (
              <li key={homeLink.path}>
                <NavLink
                  to={homeLink.path}
                  className={({ isActive }) =>
                    [
                      "px-3 py-2 rounded-md transition-colors",
                      "flex items-center gap-2",
                      "hover:bg-primary/10",
                      isActive ? "bg-secondary/10 text-tertiary font-semibold" : "text-text",
                    ].join(" ")
                  }
                >
                  <homeLink.icon className="h-4 w-4" />
                  <span>{homeLink.label}</span>
                </NavLink>
              </li>
            )}

            {/* 2) Admin (solo admins) */}
            {isAdmin && (
              <li>
                <button
                  onClick={() => setAdminMenuOpen((v) => !v)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-text hover:bg-primary/10"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Admin</span>
                  <ChevronDown
                    className={`ml-auto h-4 w-4 transition-transform ${adminMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {adminMenuOpen && (
                  <ul className="mt-1 space-y-1 pl-6 text-sm">
                    <li>
                      <NavLink
                        to="/assignments/manage"
                        className={({ isActive }) =>
                          [
                            "flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
                            "hover:bg-primary/10",
                            isActive ? "bg-secondary/10 text-tertiary font-semibold" : "text-text",
                          ].join(" ")
                        }
                      >
                        <ListChecks className="h-4 w-4" />
                        <span>Sesiones de preguntas</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/questions/manage"
                        className={({ isActive }) =>
                          [
                            "flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
                            "hover:bg-primary/10",
                            isActive ? "bg-secondary/10 text-tertiary font-semibold" : "text-text",
                          ].join(" ")
                        }
                      >
                        <ClipboardList className="h-4 w-4" />
                        <span>Gestión general</span>
                      </NavLink>
                    </li>
                  </ul>
                )}
              </li>
            )}

            {/* 3) Resto de links */}
            {otherLinks.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.path}>
                  <NavLink
                    to={link.path}
                    className={({ isActive }) =>
                      [
                        "px-3 py-2 rounded-md transition-colors",
                        "flex items-center gap-2",
                        "hover:bg-primary/10",
                        isActive ? "bg-secondary/10 text-tertiary font-semibold" : "text-text",
                      ].join(" ")
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full rounded-md px-3 py-2 transition-colors flex items-center gap-2 text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            <span>{signingOut ? "Cerrando…" : "Cerrar sesión"}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}