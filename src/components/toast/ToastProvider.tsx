import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

type ToastType = "success" | "warning" | "info" | "error";

export interface ToastOptions {
    title?: string;
    description?: string;
    durationMs?: number;
    type?: ToastType;
}

interface Toast extends Required<ToastOptions> {
    id: number;
}

const Ctx = createContext<{
    toast: (opts: ToastOptions | string) => number;
    success: (msg: string, opts?: Omit<ToastOptions, "type">) => number;
    warning: (msg: string, opts?: Omit<ToastOptions, "type">) => number;
    info: (msg: string, opts?: Omit<ToastOptions, "type">) => number;
    error: (msg: string, opts?: Omit<ToastOptions, "type">) => number;
    dismiss: (id: number) => void;
} | null>(null);

export function useToast() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
    return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const seq = useRef(0);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: number) => {
        setToasts((xs) => xs.filter((t) => t.id !== id));
    }, []);

    const spawn = useCallback((opts: ToastOptions | string): number => {
        const id = ++seq.current;
        const o: Toast = {
            id,
            title: typeof opts === "string" ? opts : opts.title || "",
            description: typeof opts === "string" ? "" : opts.description || "",
            durationMs: typeof opts === "string" ? 3800 : opts.durationMs ?? 3800,
            type: typeof opts === "string" ? "info" : opts.type ?? "info",
        };
        setToasts((xs) => [...xs, o]);
        if (o.durationMs > 0) setTimeout(() => dismiss(id), o.durationMs);
        return id;
    }, [dismiss]);

    const api = useMemo(
        () => ({
            toast: spawn,
            dismiss,
            success: (msg: string, opts?: Omit<ToastOptions, "type">) => spawn({ ...opts, title: msg, type: "success" }),
            warning: (msg: string, opts?: Omit<ToastOptions, "type">) => spawn({ ...opts, title: msg, type: "warning" }),
            info: (msg: string, opts?: Omit<ToastOptions, "type">) => spawn({ ...opts, title: msg, type: "info" }),
            error: (msg: string, opts?: Omit<ToastOptions, "type">) => spawn({ ...opts, title: msg, type: "error" }),
        }),
        [spawn, dismiss]
    );

    return (
        <Ctx.Provider value={api}>
            {children}
            {createPortal(
                <div className="pointer-events-none fixed right-3 top-3 z-[110] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2">
                    {toasts.map((t) => {
                        const colors =
                            t.type === "success"
                                ? "bg-emerald-600 text-white"
                                : t.type === "warning"
                                    ? "bg-amber-500 text-white"
                                    : t.type === "error"
                                        ? "bg-red-600 text-white"
                                        : "bg-primary text-white";

                        const Icon =
                            t.type === "success" ? CheckCircle2 : t.type === "warning" ? AlertTriangle : t.type === "error" ? XCircle : Info;

                        return (
                            <div
                                key={t.id}
                                className={`pointer-events-auto flex items-start gap-3 rounded-xl px-3 py-2 shadow-lg ${colors} animate-toastIn`}
                            >
                                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium">{t.title}</div>
                                    {t.description && <div className="truncate text-xs/5 opacity-90">{t.description}</div>}
                                </div>
                                <button
                                    className="rounded p-1 hover:bg-white/15 active:scale-95"
                                    onClick={() => api.dismiss(t.id)}
                                    aria-label="Cerrar"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>,
                document.body
            )}
        </Ctx.Provider>
    );
}