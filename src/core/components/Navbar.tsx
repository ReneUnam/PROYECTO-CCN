import ThemeToggle from "./ThemeToggle";
import { Menu } from "lucide-react";
import logo from "@/assets/logo.png";

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
        <img src={logo} alt="CCN" className="h-8 w-8 rounded-sm" />
        <h1 className="text-xl font-semibold text-brand-blue">CCN BlueWeb</h1>
      </div>
      <ThemeToggle />
    </header>
  );
}