import { useEffect, useRef } from "react";

type SaveShape = {
    selected?: Record<number, string[]>;
    scales?: Record<number, number | undefined>;
};

const key = (entryId: string) => `journal:entry:${entryId}`;

export function loadLocalAnswers(entryId: string): SaveShape {
    try {
        const raw = localStorage.getItem(key(entryId));
        if (!raw) return {};
        const parsed = JSON.parse(raw) as SaveShape;
        return parsed ?? {};
    } catch {
        return {};
    }
}

export function saveLocalAnswers(entryId: string, data: SaveShape) {
    try {
        const current = loadLocalAnswers(entryId);
        // If the caller provides `selected` or `scales`, treat those as the
        // authoritative current state (replace). This ensures deletions
        // (removing a key from `scales`) persist instead of being merged back
        // from previous saved state.
        const merged: SaveShape = {
            selected: data.selected !== undefined ? data.selected : current.selected,
            scales: data.scales !== undefined ? data.scales : current.scales,
        };
        localStorage.setItem(key(entryId), JSON.stringify(merged));
    } catch {
        // no-op
    }
}

export function clearLocalAnswers(entryId: string) {
    try {
        localStorage.removeItem(key(entryId));
    } catch {
        // no-op
    }
}

export function useBeforeUnloadDirty(enabled: boolean) {
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (!enabledRef.current) return;
            e.preventDefault();
            e.returnValue = "";
            return "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, []);
}