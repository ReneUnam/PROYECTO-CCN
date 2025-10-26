import { useEffect, useState } from "react";

type Setter<T> = (value: T | ((prev: T) => T)) => void;

export function useLocalStorage<T>(key: string, initialValue: T) {
  const isBrowser = typeof window !== "undefined";

  const [value, setValue] = useState<T>(() => {
    if (!isBrowser) return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value, isBrowser]);

  useEffect(() => {
    if (!isBrowser) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      try {
        const next =
          e.newValue !== null ? (JSON.parse(e.newValue) as T) : initialValue;
        setValue(next);
      } catch {
        setValue(initialValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key, initialValue, isBrowser]);

  const setStored: Setter<T> = (updater) =>
    setValue((prev) => (updater instanceof Function ? updater(prev) : updater));

  return [value, setStored] as const;
}