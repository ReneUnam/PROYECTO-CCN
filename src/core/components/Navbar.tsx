import logo from "@/assets/logo.png";
import ThemeToggle from "./ThemeToggle";

export function Navbar() {
  return (
    <header className="h-16 bg-surface text-text border-b border-border shadow-sm flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <img src={logo} alt="CCN" className="h-8 w-8 rounded-sm" />
        <h1 className="text-xl font-semibold text-brand-blue">CCN BlueWeb</h1>
      </div>
      <ThemeToggle />
    </header>
  );
}