import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type ChipToggleProps = {
  // Puedes pasar contenido como label o como children
  label?: ReactNode;
  children?: ReactNode;
  // Soporta ambas formas: active (nuevo) o selected (compat)
  active?: boolean;
  selected?: boolean;
  // Permite handlers async
  onClick?: () => void | Promise<void>;
  className?: string;
};

export function ChipToggle({ label, children, active, selected, onClick, className }: ChipToggleProps) {
  const isActive = (selected ?? active) ?? false;
  const content = label ?? children;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "border-transparent bg-primary text-white"
          : "border-border bg-surface text-text hover:bg-muted",
        className
      )}
    >
      {content}
    </button>
  );
}