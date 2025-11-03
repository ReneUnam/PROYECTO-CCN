import { NavLink, useNavigate } from "react-router-dom";
import { useState, type ComponentType } from "react";
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
import { supabase } from "../api/supabaseClient";

type SidebarProps = {
  open: boolean;
  onClose?: () => void;
};

type LinkItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  // roles permitidos por id (1=admin,2=teacher,3=student)
  allowedRoleIds?: number[];
};

export function Sidebar({ open }: SidebarProps) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  
  const links: LinkItem[] = [
    { label: "Inicio", path: "/dashboard", icon: Home },
    { label: "Perfil", path: "/profile", icon: User },
    { label: "Diario", path: "/journal", icon: NotebookPen },
    { label: "Preguntas", path: "/questions", icon: HelpCircle },
    { label: "Buzón", path: "/forum", icon: Inbox },
    { label: "Asistente virtual", path: "/chatbot", icon: Bot },
    // Nuevas secciones
    { label: "Recursos", path: "/resources", icon: BookOpen, allowedRoleIds: [2] }, // solo teacher
    { label: "Bienestar", path: "/wellness", icon: Brain },
    { label: "Hábitos", path: "/habits", icon: CalendarCheck },
    { label: "Estadísticas", path: "/stats", icon: BarChart3 },
    { label: "Notificaciones", path: "/notifications", icon: Bell },
    { label: "Configuración", path: "/settings", icon: Settings },
  ];

  const { user } = useAuth();
  const roleId = user?.role_id ?? 3;
  const isAdmin = roleId === 1;
  const visibleLinks = links.filter((l) => isAdmin || !l.allowedRoleIds || l.allowedRoleIds.includes(roleId));

  const base = "bg-surface text-text border-r border-border shadow-sm overflow-y-auto";

    function clearLocalSupabaseSession() {
    try {
      // borra la clave sb-<ref>-auth-token
      const key = Object.keys(localStorage).find(
        (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
      );
      if (key) localStorage.removeItem(key);
    } catch {}
  }
async function handleSignOut() {
    setSigningOut(true);
    try {
      // 1) Sign out local (instantáneo)
      await supabase.auth.signOut({ scope: 'local' as any });

      // 2) Fallback manual por si el paso anterior falla
      clearLocalSupabaseSession();

      // 3) Navega al login y refresca estado
      navigate('/login', { replace: true });
      setTimeout(() => window.location.reload(), 50);

      // 4) Opcional: revoca refresh tokens en el servidor (no bloquea la UI)
      void supabase.auth.signOut(); // scope 'global' por defecto
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
                        "hover:bg-primary/10",
                        isActive ? "bg-secondary/10 text-tertiary font-semibold" : "text-text",
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

        <div className="p-4 border-t border-border">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="w-full px-3 py-2 rounded-md flex items-center gap-2 text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span>{signingOut ? 'Cerrando…' : 'Cerrar sesión'}</span>
      </button>
    </div>
      </div>
    </aside>
  );
}