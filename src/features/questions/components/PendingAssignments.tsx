import { useEffect, useState } from "react";
import { type Assignment, getMyAssignments, startAssignment } from "../api/assignmentsApi";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function PendingAssignments() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getMyAssignments().then(setItems).catch(() => setItems([]));
  }, []);

  const pending = items.filter(a => a.completed < a.max_attempts);
  if (!pending.length) return null;

  const onStart = async (a: Assignment) => {
    setLoading(true);
    try {
      const sessionId = await startAssignment(a.assignment_id);
      navigate(`/questions/session/${a.assignment_id}?session=${sessionId}`); 
     
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[color:var(--color-text)]">
          Tienes {pending.length} asignación(es)
        </h3>
      </div>
      <ul className="space-y-2">
        {pending.map(a => (
          <li key={a.assignment_id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-[color:var(--color-text)]">{a.survey_name}</p>
              <p className="text-xs text-[color:var(--color-text)]/70">
                Intentos: {a.completed}/{a.max_attempts}
              </p>
            </div>
            <Button size="sm" onClick={() => onStart(a)} disabled={loading}>Comenzar</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}