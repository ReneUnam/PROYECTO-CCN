import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./core/styles/globals.css";

(() => {
  if ((window as any).__themeInit) return;
  (window as any).__themeInit = true;

  const KEY = "theme";
  const USER_KEY = "theme:user";
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const userSet = () => localStorage.getItem(USER_KEY) === "1";
  const setDark = (on: boolean) => {
    document.documentElement.classList.toggle("dark", on);
    document.body.classList.toggle("dark", on);
  };
  const computeIsDark = () => (userSet() ? localStorage.getItem(KEY) === "dark" : media.matches);

  const applyTheme = () => setDark(computeIsDark());
  const handleSystemChange = () => { if (!userSet()) setDark(media.matches); };

  media.addEventListener ? media.addEventListener("change", handleSystemChange)
                         : media.addListener(handleSystemChange as any);

  applyTheme();

  (window as any).setTheme = (mode: "light" | "dark" | "system") => {
    if (mode === "system") {
      localStorage.removeItem(KEY);
      localStorage.removeItem(USER_KEY);
    } else {
      localStorage.setItem(KEY, mode);
      localStorage.setItem(USER_KEY, "1");
    }
    applyTheme();
  };
})();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);