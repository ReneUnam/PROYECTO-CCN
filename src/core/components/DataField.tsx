import { CalendarDays, X } from "lucide-react";
import { useRef } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
};

export function DateField({
  value,
  onChange,
  placeholder = "Fecha",
  label,
  className = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    // Algunos navegadores soportan showPicker
    if ((el as any).showPicker) {
      try {
        (el as any).showPicker();
        return;
      } catch {}
    }
    // Fallback: focus + click para abrir nativo
    el.focus();
    el.click();
  }

  return (
    <div className={"flex flex-col gap-1 " + className}>
      {label && (
        <label className="text-xs font-medium text-text/70 select-none">
          {label}
        </label>
      )}
      <div
        onClick={openPicker}
        className="group flex h-9 cursor-pointer items-center justify-between rounded-lg border border-border bg-muted px-3 text-sm hover:bg-muted/70"
      >
        <span className={value ? "text-text" : "text-text/50"}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="rounded p-0.5 text-text/40 hover:bg-surface hover:text-text/70"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <CalendarDays className="h-4 w-4 text-text/50" />
        </div>
      </div>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
