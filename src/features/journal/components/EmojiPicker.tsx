import { useMemo, useState } from "react";

const EMOJIS = [
    // Emociones positivas
    "😀", "😃", "😄", "😁", "😆", "😊", "🙂", "😉", "😍", "😘", "😎", "🤩", "🥳", "🤗", "😌", "😺", "😻", "👍", "👏", "🙌", "💪", "✨", "🌟", "🔥", "🌈",
    // Emociones negativas
    "😴", "😔", "🙁", "😭", "😠", "🤬", "😡", "😤", "😒", "😞", "😟", "😢", "😣", "😩", "😫", "😖", "😬", "😰", "😨", "😱", "🥵", "🥶", "🤯", "😓", "😥", "😧", "😲", "😳", "🥺", "😢", "😤", "😠", "😡", "🤬", "😶", "😐", "😑", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "🤬", "😠", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥴", "😵", "😵‍💫", "🤯", "😲", "🥶", "🥵", "😱", "😨", "😰", "😥", "😢", "😭", "😤", "😠", "😡", "🤬",
    // Otros sentimientos y sensaciones
    "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "😵‍💫", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕", "🫤", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "🤬", "😠",
    // Sociales y otros
    "🙏", "👎", "🍎", "⚽", "🎵", "🎨", "🌿"
];

type Props = { onPick: (emoji: string) => void };

export function EmojiPicker({ onPick }: Props) {
    const [q, setQ] = useState("");
    const results = useMemo(() => {
        if (!q.trim()) return EMOJIS;
        const s = q.toLowerCase();
        const dict: Record<string, string[]> = {
            feliz: ["😀", "😃", "😄", "😁", "😊", "🙂", "😉", "😎", "🤩", "🥳"],
            triste: ["🙁", "😭", "😔"],
            enojado: ["😠", "🤬"],
            fuego: ["🔥"], estrella: ["✨", "🌟"], ok: ["👍"], arcoiris: ["🌈"], planta: ["🌿"],
            musica: ["🎵"], arte: ["🎨"], deporte: ["⚽"],
        };
        const byWord = Object.entries(dict).flatMap(([k, v]) => (k.includes(s) ? v : []));
        const set = new Set([...byWord, ...EMOJIS.filter((e) => e.includes(s))]);
        return Array.from(set);
    }, [q]);

    return (
        <div className="w-64">
            <input
                className="mb-2 h-8 w-full rounded-md border border-border bg-surface px-2 text-sm hover:cursor-pointer"
                placeholder="Buscar emoji (ej. feliz, fuego, ok)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
            />
            <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
                {results.map((e, i) => (
                    <button key={`${e}-${i}`} className="grid h-8 w-8 place-items-center rounded hover:bg-muted hover:cursor-pointer" onClick={() => onPick(e)} type="button">
                        {e}
                    </button>
                ))}
            </div>
        </div>
    );
}