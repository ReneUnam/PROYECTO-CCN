import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import clsx from "clsx";

interface LayoutProps {
  children?: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const mq = typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)") : undefined;
  const getIsDesktop = () => (mq ? mq.matches : true);

  const [isDesktop, setIsDesktop] = useState(getIsDesktop());
  const [sidebarOpen, setSidebarOpen] = useState(getIsDesktop());

  useEffect(() => {
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      setSidebarOpen(e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const contentPaddingClass = clsx(
    // padding horizontal del contenido
    isDesktop && !sidebarOpen ? "px-6 lg:px-10 xl:px-16 2xl:px-24 max-w-6xl mx-auto" : "px-6"
  );

  return (
    // Pantalla completa sin scroll del documento
    <div className="h-screen overflow-hidden bg-muted text-text">
      {/* Overlay móvil */}
      {!isDesktop && sidebarOpen && (
        <button
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      {/* Header fijo (alto 4rem) */}
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border bg-surface">
        <Navbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      </header>

      {/* Sidebar fijo debajo del header */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Área de contenido: solo aquí hay scroll */}
      {/* <main className="pt-16 md:pl-64 h-[calc(100vh-4rem)] overflow-y-auto"> */}
      <main
        className={clsx(
          "fixed inset-x-0 top-16 bottom-0 overflow-y-auto", // sin transición para evitar reflows costosos
          sidebarOpen && "md:pl-64"
        )}
      >
      <div className={clsx("py-6", contentPaddingClass)}>
        {children ?? <Outlet />}
      </div>
    </main>
        {/* </main> */ }
    </div >
  );
}