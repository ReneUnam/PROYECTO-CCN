import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";

type ConfirmVariant = "danger" | "info" | "publish";

interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  requireTextMatch?: string;
  icon?: ReactNode;
}

interface InternalState extends ConfirmOptions {
  open: boolean;
  resolve?: (v: boolean) => void;
}

const Ctx = createContext<{ confirm: (opts: ConfirmOptions) => Promise<boolean> } | null>(null);

export function useConfirm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InternalState>({ open: false });
  const [typed, setTyped] = useState("");

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setTyped("");
      setState({ open: true, resolve, ...opts });
    });
  }, []);

  const close = (val: boolean) => {
    state.resolve?.(val);
    setState((s) => ({ ...s, open: false }));
    setTimeout(() => setTyped(""), 160);
  };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => state.open && e.key === "Escape" && close(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [state.open]);

  return (
    <Ctx.Provider value={{ confirm }}>
      {children}
      {state.open &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => close(false)} />
            <div className="relative w-[95%] max-w-sm rounded-xl border border-border bg-surface p-5 shadow-xl animate-popIn">
              <div className="mb-3 flex items-center gap-3">
                <div
                  className={[
                    "grid h-10 w-10 place-items-center rounded-full",
                    state.variant === "danger"
                      ? "bg-red-600/10 text-red-600"
                      : state.variant === "publish"
                      ? "bg-primary/10 text-primary"
                      : "bg-primary/10 text-primary",
                  ].join(" ")}
                >
                  {state.icon ? (
                    state.icon
                  ) : state.variant === "danger" ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : state.variant === "publish" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Info className="h-5 w-5" />
                  )}
                </div>
                <h2 className="text-base font-semibold">{state.title || "Confirmar acción"}</h2>
              </div>

              {state.message && <p className="mb-4 whitespace-pre-line text-sm text-text/70">{state.message}</p>}

              {state.requireTextMatch && (
                <div className="mb-4 space-y-2">
                  <label className="text-xs font-medium text-text/70">Escribe "{state.requireTextMatch}" para confirmar</label>
                  <input
                    autoFocus
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition placeholder:text-text/40 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder={state.requireTextMatch}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => close(false)}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-sm transition hover:bg-muted hover:shadow-sm active:scale-[0.97] hover:cursor-pointer"
                >
                  {state.cancelText || "Cancelar"}
                </button>
                <button
                  onClick={() => close(true)}
                  disabled={!!state.requireTextMatch && typed.trim() !== state.requireTextMatch.trim()}
                  className={[
                    "rounded-md px-3 py-2 text-sm text-white transition active:scale-[0.97] disabled:opacity-50 hover:cursor-pointer",
                    state.variant === "danger"
                      ? "bg-red-600 hover:bg-red-700"
                      : state.variant === "publish"
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-primary hover:bg-primary/90",
                  ].join(" ")}
                >
                  {state.confirmText || "Confirmar"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </Ctx.Provider>
  );
}