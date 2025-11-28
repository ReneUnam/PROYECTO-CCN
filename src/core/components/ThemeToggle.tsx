import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from '@/components/ui/button';

type Mode = "system" | "light" | "dark";

const options: { key: Mode; label: string; icon: any }[] = [
  { key: "system", label: "Sistema", icon: Monitor },
  { key: "light", label: "Claro", icon: Sun },
  { key: "dark", label: "Oscuro", icon: Moon },
];

function getInitialMode(): Mode {
  const user = localStorage.getItem("theme:user") === "1";
  const stored = localStorage.getItem("theme") as Mode | null;
  return user && stored ? stored : "system";
}

export function ThemeToggle() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(getInitialMode);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (window as any).setTheme?.(mode);
  }, [mode]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      if (
        popRef.current &&
        !popRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const ActiveIcon = options.find(o => o.key === mode)?.icon ?? Monitor;

  return (
    <div className="relative">
      <Button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm
                   border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]
                   hover:bg-[color:var(--color-muted)] dark:hover:bg-[color:var(--color-muted)] transition-colors duration-150
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
      >
        <ActiveIcon className="h-4 w-4" />
        Tema
      </Button>

      {open && (
        <div
          ref={popRef}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border shadow-lg
                     border-[var(--color-border)] bg-[color:var(--color-surface)]"
        >
          {options.map(({ key, label, icon: Icon }) => {
            const active = mode === key;
            return (
              <button
                key={key}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setMode(key);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm
                  ${active ? "bg-[color:var(--color-primary)]/10 text-[color:var(--color-text)]" : "text-[color:var(--color-text)]"}
                  hover:bg-[color:var(--color-muted)] dark:hover:bg-[color:var(--color-muted)] transition-colors duration-150`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {active && <span className="ml-auto h-2 w-2 rounded-full bg-[color:var(--color-primary)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}