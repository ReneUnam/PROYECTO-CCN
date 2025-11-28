import { ThemeToggle } from "./ThemeToggle";
import { Menu } from "lucide-react";
import { Link } from 'react-router-dom';


type Props = { onToggleSidebar?: () => void };

export function Navbar({ onToggleSidebar }: Props) {
  return (
    <header className="h-16 bg-surface text-text border-b border-border shadow-sm flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Alternar menú"
          onClick={onToggleSidebar}
          className="inline-flex md:inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-brand-blue/10"
        >
          <Menu size={18} />
        </button>
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-8 w-8 object-contain logo-stroke-white"
            style={{ ['--stroke' as any]: '1px' }}
          />
          <h1 className="text-xl font-semibold text-tertiary">CCN BlueWeb</h1>
        </Link>
      </div>
      <ThemeToggle />
    </header>
  );
}