import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/core/api/supabaseClient";
import { FullScreenLoader } from "@/components/FullScreenLoader"; 

type Overview = { assignment_id:number; survey_name:string; start_at:string|null; end_at:string|null; recipients:number; started:number; completed:number; };
type Row = { assignment_id:number; survey_name:string; question_id:number; question_text:string; session_id:string|null; session_status:string|null; response_value:any; response_date:string|null; first_names:string|null; last_names:string|null; };

export default function AdminQuestionsDashboard() {
  const [overview, setOverview] = useState<Overview[]>([]);
  const [active, setActive] = useState<number|null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { supabase.from("v_assignments_overview").select("*").then(({data,error})=>{ if(error) alert(error.message); else setOverview(data||[]); }); }, []);
  useEffect(() => {
    if (!active) return;
    setLoading(true);
    supabase.from("v_assignment_responses").select("*").eq("assignment_id", active)
      .then(
        ({ data, error }) => { if (error) alert(error.message); else setRows((data || []) as Row[]); setLoading(false); },
        () => { setLoading(false); }
      );
  }, [active]);

  const csv = useMemo(() => {
    if (!rows.length) return "";
    const headers = ["assignment_id","survey_name","question_id","question_text","session_id","session_status","response_text","response_date","first_names","last_names"];
    const lines = rows.map(r => {
      const txt = typeof r.response_value?.text === "string" ? r.response_value.text.replace(/\n/g," ") : "";
      return [r.assignment_id,r.survey_name,r.question_id,`"${(r.question_text||"").replace(/"/g,'""')}"`,r.session_id||"",r.session_status||"",`"${txt.replace(/"/g,'""')}"`,r.response_date||"",`"${r.first_names||""}"`,`"${r.last_names||""}"`].join(",");
    });
    return [headers.join(","), ...lines].join("\n");
  }, [rows]);

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `assignment_${active}_responses.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl p-4 text-text">
      <h1 className="mb-4 text-2xl font-semibold">Resultados de preguntas</h1>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 font-medium">Asignaciones</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-text/60">
              <tr><th className="py-2">ID</th><th>Cuestionario</th><th>Inicio</th><th>Vence</th><th>Destinatarios</th><th>Iniciadas</th><th>Completadas</th><th></th></tr>
            </thead>
            <tbody>
              {overview.map(o => (
                <tr key={o.assignment_id} className="border-t border-border">
                  <td className="py-2">{o.assignment_id}</td>
                  <td>{o.survey_name}</td>
                  <td>{o.start_at?.replace("T"," ").slice(0,16) || "—"}</td>
                  <td>{o.end_at?.replace("T"," ").slice(0,16) || "—"}</td>
                  <td>{o.recipients}</td>
                  <td>{o.started}</td>
                  <td>{o.completed}</td>
                  <td><button className="rounded-md bg-primary px-3 py-1 text-white" onClick={() => setActive(o.assignment_id)}>Ver respuestas</button></td>
                </tr>
              ))}
              {!overview.length && (<tr><td className="py-6 text-text/60" colSpan={8}>Sin datos</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {active && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Respuestas de asignación #{active}</h2>
            <div className="flex gap-2">
              <button className="rounded-md border border-border px-3 py-1" onClick={() => setActive(null)}>Cerrar</button>
              <button className="rounded-md bg-primary px-3 py-1 text-white" onClick={downloadCsv} disabled={!rows.length || loading}>Exportar CSV</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-text/60">
                <tr><th className="py-2">Persona</th><th>Pregunta</th><th>Respuesta</th><th>Fecha</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {rows.map((r,i) => (
                  <tr key={i} className="border-t border-border align-top">
                    <td className="py-2">{[r.first_names, r.last_names].filter(Boolean).join(" ") || "—"}</td>
                    <td>{r.question_text}</td>
                    <td className="max-w-xl whitespace-pre-wrap">{typeof r.response_value?.text === "string" ? r.response_value.text : "—"}</td>
                    <td>{r.response_date?.replace("T"," ").slice(0,16) || "—"}</td>
                    <td>{r.session_status || "—"}</td>
                  </tr>
                ))}
                {!rows.length && (<tr><td className="py-6 text-text/60" colSpan={5}>{loading ? <FullScreenLoader /> : "Sin respuestas"}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}