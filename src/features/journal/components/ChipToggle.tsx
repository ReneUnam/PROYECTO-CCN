import { cn } from "@/core/utils/cn";
import type { JSX } from "react";

type ChipToggleProps = {
  label: string | JSX.Element;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
};

export function ChipToggle({ label, selected, onClick, className }: ChipToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        selected
          ? "border-transparent bg-primary text-white"
          : "border-border bg-surface text-text hover:bg-muted",
        className
      )}
    >
      {label}
    </button>
  );
}