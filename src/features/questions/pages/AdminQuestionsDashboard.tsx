import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/core/api/supabaseClient";
import { DateField } from "@/core/components/DataField";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Search,
  X,
  Users,
  RotateCw,
} from "lucide-react";

type Overview = {
  assignment_id: number;
  survey_name: string;
  start_at: string | null;
  end_at: string | null;
  recipients: number;
  started: number;
  completed: number;
};
type Row = {
  assignment_id: number;
  survey_name: string;
  question_id: number;
  question_text: string;
  session_id: string | null;
  session_status: string | null;
  response_value: any;
  response_date: string | null;
  first_names: string | null;
  last_names: string | null;
  profile_id?: string | null;
};

type Filters = { q: string; status: "all" | "open" | "closed"; from: string; to: string };
type SortOrder = "recent" | "old";

interface StudentIndex {
  profile_id: string;
  first_names: string | null;
  last_names: string | null;
  institution_id?: string | null;
}

export default function AdminQuestionsDashboard() {
  const [overview, setOverview] = useState<Overview[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState<Filters>({ q: "", status: "all", from: "", to: "" });
  const [draft, setDraft] = useState<Filters>(filters);
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");

  // Sesiones por asignación activa
  const [sessionPanel, setSessionPanel] = useState<{ id: string; name: string; survey: string; items: Row[] } | null>(null);

  // Modo estudiantes
  const [studentMode, setStudentMode] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentIndex, setStudentIndex] = useState<StudentIndex[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentSelected, setStudentSelected] = useState<StudentIndex | null>(null);
  const [studentRows, setStudentRows] = useState<Row[]>([]); // todas sus respuestas
  const [studentRowsLoading, setStudentRowsLoading] = useState(false);
  const [sessionMeta, setSessionMeta] = useState<Record<string, { started_at: string | null; submitted_at: string | null }>>({});
  const [assignmentNames, setAssignmentNames] = useState<Record<number, string>>({});

  // Buscar estudiantes on-demand con fallback robusto
  async function searchStudents(q: string) {
    setStudentLoading(true);
    try {
      const filters = q.trim()
        ? // Buscar por nombre/apellido en la vista si existen columnas
          (builder: any) => builder.or(`first_names.ilike.%${q}%,last_names.ilike.%${q}%`)
        : (builder: any) => builder;

      let resp = await filters(
        supabase
          .from("v_assignment_responses")
          .select("profile_id, first_names, last_names")
          .limit(2000)
      );

      let data = resp.data as any[] | null;
      let error = resp.error as any | null;

      // Si falla o no trae columnas esperadas, probar contra profiles
      if (error || !data) {
        let fb = supabase
          .from("profiles")
          .select("id, first_names, last_names, institution_id, email")
          .limit(200);
        if (q.trim()) {
          fb = fb.or(
            `first_names.ilike.%${q}%,last_names.ilike.%${q}%,institution_id.ilike.%${q}%,email.ilike.%${q}%`
          );
        }
        const fallback = await fb;

        if (!fallback.error && fallback.data) {
          const mapped: StudentIndex[] = (fallback.data as any[]).map((r) => ({
            profile_id: r.id,
            first_names: r.first_names ?? null,
            last_names: r.last_names ?? null,
            institution_id: r.institution_id ?? null,
          }));
          setStudentIndex(mapped);
        } else {
          setStudentIndex([]);
        }
      } else {
        // Deduplicar por profile_id y limpiar nulos
        const map = new Map<string, StudentIndex>();
        (data || []).forEach((r: any) => {
          if (!r?.profile_id) return;
          if (!map.has(r.profile_id))
            map.set(r.profile_id, {
              profile_id: r.profile_id,
              first_names: r.first_names ?? null,
              last_names: r.last_names ?? null,
              institution_id: null,
            });
        });
        // Enriquecer con institution_id desde profiles
        const ids = [...map.keys()];
        if (ids.length) {
          const prof = await supabase
            .from("profiles")
            .select("id,institution_id")
            .in("id", ids);
          if (!prof.error && prof.data) {
            (prof.data as any[]).forEach((p) => {
              const it = map.get(p.id);
              if (it) it.institution_id = p.institution_id ?? null;
            });
          }
        }
        setStudentIndex([...map.values()]);
      }
    } catch (e) {
      console.error("student search error", e);
      setStudentIndex([]);
    } finally {
      setStudentLoading(false);
    }
  }

  // Carga overview
  useEffect(() => {
    supabase.from("v_assignments_overview").select("*").then(({ data }) => setOverview(data || []));
  }, []);

  // Carga respuestas de asignación activa
  useEffect(() => {
    setRows([]); // Limpiar filas al cambiar de asignación activa
    if (!active) return;
    setLoading(true);
    supabase
      .from("v_assignment_responses")
      .select("*")
      .eq("assignment_id", active)
      .then(({ data, error }) => {
        setRows((data || []) as Row[]); // Siempre setear, aunque esté vacío
        setLoading(false);
      });
  }, [active]);

  // Reset de resultados al activar modo estudiantes (espera acción de Buscar)
  useEffect(() => {
    if (!studentMode) return;
    setStudentIndex([]);
    setStudentSelected(null);
    setStudentRows([]);
  }, [studentMode]);

  // Auto-carga inicial de usuarios al entrar en modo (si aún no se ha buscado)
  useEffect(() => {
    if (studentMode && !studentIndex.length && !studentLoading) {
      // búsqueda vacía para traer participantes activos
      searchStudents("");
    }
  }, [studentMode, studentIndex.length, studentLoading]);

  // Carga todas las respuestas del estudiante seleccionado
  useEffect(() => {
    if (!studentSelected) return;
    setStudentRowsLoading(true);
    (async () => {
      // Primer intento: filtrar directamente por profile_id en la vista
      const first = await supabase
        .from("v_assignment_responses")
        .select("*")
        .eq("profile_id", studentSelected.profile_id);
      if (!first.error && first.data && first.data.length) {
        setStudentRows(first.data as Row[]);
        setStudentRowsLoading(false);
        return;
      }
      // Fallback: obtener sesiones del perfil y luego traer respuestas por session_id
      const sessions = await supabase
        .from("survey_sessions")
        .select("id")
        .eq("profile_id", studentSelected.profile_id)
        .limit(500);
      const ids = (!sessions.error && sessions.data ? (sessions.data as any[]).map((s) => s.id) : []) as string[];
      if (ids.length) {
        const resp = await supabase
          .from("v_assignment_responses")
          .select("*")
          .in("session_id", ids)
          .limit(5000);
        if (!resp.error && resp.data) setStudentRows(resp.data as Row[]);
      } else {
        setStudentRows([]);
      }
      setStudentRowsLoading(false);
    })();
  }, [studentSelected]);

  // Enriquecer sesiones con metadatos (started_at/submitted_at) para mostrar un título amigable
  useEffect(() => {
    const ids = Array.from(
      new Set(
        studentRows
          .map((r) => r.session_id)
          .filter((x): x is string => !!x)
      )
    );
    if (!ids.length) {
      setSessionMeta({});
      return;
    }
    supabase
      .from("survey_sessions")
      .select("id, started_at, submitted_at")
      .in("id", ids)
      .then(({ data, error }) => {
        if (!error && data) {
          const m: Record<string, { started_at: string | null; submitted_at: string | null }> = {};
          (data as any[]).forEach((s) => {
            m[s.id] = { started_at: s.started_at ?? null, submitted_at: s.submitted_at ?? null };
          });
          setSessionMeta(m);
        }
      });
  }, [studentRows]);

  // Obtener nombres de cuestionarios por assignment_id presentes en studentRows
  useEffect(() => {
    const ids = Array.from(new Set(studentRows.map(r => r.assignment_id).filter((v): v is number => typeof v === 'number')));
    if (!ids.length) { setAssignmentNames({}); return; }
    (async () => {
      try {
        const res = await supabase
          .from('survey_assignments')
          .select('id, survey_id, surveys(name)')
          .in('id', ids);
        const map: Record<number, string> = {};
        const missingSurveyIds: number[] = [];
        if (!res.error && res.data) {
          (res.data as any[]).forEach(row => {
            const name = row.surveys?.name || null;
            if (name) map[row.id] = name; else if (row.survey_id) missingSurveyIds.push(row.survey_id);
          });
        }
        if (missingSurveyIds.length) {
          const res2 = await supabase
            .from('surveys')
            .select('id, name')
            .in('id', missingSurveyIds);
          if (!res2.error && res2.data) {
            (res2.data as any[]).forEach(r => { map[r.id] = r.name; });
          }
        }
        setAssignmentNames(map);
      } catch (e) {
        console.warn('assignment names fetch error', e);
      }
    })();
  }, [studentRows]);

  // Lista filtrada de asignaciones
  const assignmentsFiltered = useMemo(() => {
    const q = filters.q.toLowerCase();
    const now = new Date();
    const f = filters.from ? new Date(filters.from + "T00:00:00") : null;
    const t = filters.to ? new Date(filters.to + "T23:59:59") : null;
    let arr = overview.filter((o) => {
      if (q && !o.survey_name.toLowerCase().includes(q) && !String(o.assignment_id).includes(q)) return false;
      const start = o.start_at ? new Date(o.start_at) : null;
      if (f && start && start < f) return false;
      if (t && start && start > t) return false;
      if (filters.status === "open") {
        const end = o.end_at ? new Date(o.end_at) : null;
        if (end && end < now) return false;
      } else if (filters.status === "closed") {
        const end = o.end_at ? new Date(o.end_at) : null;
        if (!end || end >= now) return false;
      }
      return true;
    });
    const toNum = (d: string | null) => (d ? new Date(d).getTime() : 0);
    arr = arr.sort((a, b) => {
      const A = toNum(a.start_at);
      const B = toNum(b.start_at);
      return sortOrder === "recent" ? B - A : A - B;
    });
    return arr;
  }, [overview, filters, sortOrder]);

  // Sesiones agrupadas (asignación activa)
  const sessionsActive = useMemo(() => {
    const map = new Map<string, { name: string; status: string; last: string | null; items: Row[] }>();
    rows.forEach((r) => {
      const sid = r.session_id || "-";
      const name = [r.first_names, r.last_names].filter(Boolean).join(" ") || "—";
      const entry = map.get(sid);
      if (!entry) {
        map.set(sid, { name, status: r.session_status || "—", last: r.response_date, items: [r] });
      } else {
        entry.items.push(r);
        if (!entry.last || (r.response_date && r.response_date > entry.last)) entry.last = r.response_date;
      }
    });
    return [...map.entries()].map(([sessionId, v]) => ({ sessionId, ...v }));
  }, [rows]);

  // Filtro por persona dentro de asignación activa
  const [personQ, setPersonQ] = useState("");
  const sessionsFiltered = useMemo(() => {
    const q = personQ.trim().toLowerCase();
    if (!q) return sessionsActive;
    return sessionsActive.filter((s) => s.name.toLowerCase().includes(q));
  }, [sessionsActive, personQ]);

  // Agrupación para panel de estudiante: asignaciones -> sesiones propias
  const studentAssignments = useMemo(() => {
    if (!studentSelected) return [];
    const byAssignment = new Map<
      number,
      {
        survey_name: string;
        sessions: Map<string, { last: string | null; status: string; items: Row[] }>;
      }
    >();
    studentRows.forEach((r) => {
      const aid = r.assignment_id;
      if (!byAssignment.has(aid))
        byAssignment.set(aid, {
          survey_name: r.survey_name,
          sessions: new Map(),
        });
      const pack = byAssignment.get(aid)!;
      const sid = r.session_id || "-";
      if (!pack.sessions.has(sid))
        pack.sessions.set(sid, {
          last: r.response_date,
          status: r.session_status || "—",
          items: [r],
        });
      else {
        const sess = pack.sessions.get(sid)!;
        sess.items.push(r);
        if (!sess.last || (r.response_date && r.response_date > sess.last)) sess.last = r.response_date;
      }
    });
    // Orden por última respuesta (reciente primero)
    return [...byAssignment.entries()].map(([assignment_id, data]) => {
      const sessions = [...data.sessions.entries()].map(([session_id, s]) => ({
        session_id,
        last: s.last,
        status: s.status,
        items: s.items,
      }));
      sessions.sort((a, b) => {
        const A = a.last ? new Date(a.last).getTime() : 0;
        const B = b.last ? new Date(b.last).getTime() : 0;
        return B - A;
      });
      return {
        assignment_id,
        survey_name: data.survey_name,
        sessions,
      };
    });
  }, [studentRows, studentSelected]);

  async function exportExcel() {
    if (!rows.length) return;
    const XLSX = await import("xlsx");
    const data = rows.map((r) => ({
      Asignacion: r.assignment_id,
      Cuestionario: r.survey_name,
      Sesion: r.session_id || "",
      Persona: [r.first_names, r.last_names].filter(Boolean).join(" "),
      EstadoSesion: r.session_status,
      PreguntaID: r.question_id,
      Pregunta: r.question_text,
      Respuesta: typeof r.response_value?.text === "string" ? r.response_value.text : "",
      Fecha: r.response_date?.replace("T", " ").slice(0, 16),
    }));
    const wb = XLSX.utils.book_new();
    wb.SheetNames.length === 0 && XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), "tmp");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Respuestas");
    XLSX.writeFile(wb, `asignacion_${active}_respuestas.xlsx`);
  }

  function openSession(sessionId: string) {
    let source: Row[] | undefined = rows.filter((r) => r.session_id === sessionId);
    if (!source.length && studentSelected) source = studentRows.filter((r) => r.session_id === sessionId);
    if (!source.length) return;
    const name = [source[0].first_names, source[0].last_names].filter(Boolean).join(" ") || "—";
    const survey = assignmentNames[source[0].assignment_id] || source[0].survey_name || "Cuestionario";
    setSessionPanel({ id: sessionId, name, survey, items: source });
  }

  // Lista actual de estudiantes proviene del último fetch; se muestra tal cual

  return (
    <div className="mx-auto max-w-7xl p-4 text-text">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Resultados de preguntas</h1>
          <p className="text-sm text-text/70">
            Filtra, ordena, busca usuarios y revisa respuestas por sesión.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setStudentMode((v) => !v);
              setStudentSelected(null);
              setStudentQuery("");
            }}
            className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm border border-border ${
              studentMode ? "bg-primary text-white" : "bg-surface hover:bg-muted"
            }`}
          >
            <Users className="h-4 w-4" />
            Usuarios
          </button>
        </div>
      </header>

      {/* Filtros asignaciones */}
      {!studentMode && (
        <section className="mb-5 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_140px_140px_140px]">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3">
              <Search className="h-4 w-4 text-text/50" />
              <input
                placeholder="Buscar cuestionario"
                value={draft.q}
                onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
                className="h-9 w-full bg-transparent text-sm outline-none"
              />
            </div>
            <select
              value={draft.status}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as Filters["status"] }))}
              className="h-9 rounded-lg border border-border bg-muted px-3 text-sm"
              title="Filtra por estado de la asignación: 'En curso' muestra las que aún no han vencido, 'Vencidas' las que ya pasaron la fecha de vencimiento."
            >
              <option value="all">Todas</option>
              <option value="open">En curso</option>
              <option value="closed">Vencidas</option>
            </select>
            <DateField value={draft.from} onChange={(v: any) => setDraft((d) => ({ ...d, from: v }))} placeholder="Desde" />
            <DateField value={draft.to} onChange={(v: any) => setDraft((d) => ({ ...d, to: v }))} placeholder="Hasta" />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex overflow-hidden rounded-md border border-border">
              <button
                onClick={() => setSortOrder("recent")}
                className={`h-9 px-3 text-sm ${
                  sortOrder === "recent" ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
                }`}
              >
                Recientes
              </button>
              <button
                onClick={() => setSortOrder("old")}
                className={`h-9 px-3 text-sm border-l border-border ${
                  sortOrder === "old" ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
                }`}
              >
                Antiguas
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilters(draft)}
                className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-4 text-sm text-white hover:bg-primary/90"
              >
                <Filter className="h-4 w-4" /> Aplicar filtros
              </button>
              <button
                onClick={() => {
                  setDraft({ q: "", status: "all", from: "", to: "" });
                  setFilters({ q: "", status: "all", from: "", to: "" });
                  setSortOrder("recent");
                }}
                className="h-9 rounded-md border border-border px-4 text-sm hover:bg-muted"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Listado asignaciones */}
      {!studentMode && (
        <div className="space-y-4">
          {assignmentsFiltered.map((o) => {
            const isActive = active === o.assignment_id;
            return (
              <div key={o.assignment_id} className="rounded-xl border border-border bg-surface">
                <button
                  onClick={() => {
                    setActive(isActive ? null : o.assignment_id);
                    setPersonQ("");
                  }}
                  className="flex w-full items-center justify-between rounded-t-xl px-4 py-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{o.survey_name}</div>
                    <div className="mt-0.5 text-xs text-text/60">
                      Inicio: {o.start_at?.slice(0, 16).replace("T", " ") || "—"} · Vence:{" "}
                      {o.end_at?.slice(0, 16).replace("T", " ") || "—"}
                    </div>
                  </div>
                  <div className="hidden items-center gap-6 text-xs sm:flex">
                    <span>Destinatarios: {o.recipients}</span>
                    <span>Iniciadas: {o.started}</span>
                    <span>Completadas: {o.completed}</span>
                    {isActive ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:hidden">
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      {o.completed}/{o.recipients}
                    </span>
                    {isActive ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </button>

                {isActive && (
                  <div className="px-4 pb-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">Sesiones</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={exportExcel}
                          disabled={!rows.length}
                          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-white hover:bg-primary/90 disabled:opacity-50"
                        >
                          <Download className="h-3.5 w-3.5" /> Excel
                        </button>
                        <button
                          onClick={() => {
                            setActive(null);
                            setRows([]);
                          }}
                          className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>

                    <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-muted px-3">
                      <Search className="h-4 w-4 text-text/50" />
                      <input
                        placeholder="Buscar persona…"
                        value={personQ}
                        onChange={(e) => setPersonQ(e.target.value)}
                        className="h-9 w-full bg-transparent text-sm outline-none"
                      />
                    </div>

                    {/* Mobile tarjetas */}
                    <div className="space-y-3 md:hidden">
                      {sessionsFiltered.map((s) => {
                        const status = s.status?.toLowerCase();
                        let statusLabel = s.status;
                        let statusClass = "text-text/60";
                        if (status === "completed") {
                          statusLabel = "Completada";
                          statusClass = "text-emerald-600 font-medium";
                        } else if (status === "in_progress") {
                          statusLabel = "En progreso";
                          statusClass = "text-amber-600 font-medium";
                        }
                        return (
                          <div key={s.sessionId} className="rounded-lg border border-border">
                            <div className="flex items-center justify-between border-b border-border px-3 py-2">
                              <div className="text-xs text-text/60">Sesión</div>
                              <div className="text-xs font-mono">{s.sessionId.slice(0, 8)}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-3 text-sm">
                              <div className="text-text/60">Persona</div>
                              <div className="truncate">{s.name}</div>
                              <div className="text-text/60">Estado</div>
                              <div className={statusClass}>{statusLabel}</div>
                              <div className="text-text/60">Última</div>
                              <div>{s.last?.slice(0, 16).replace("T", " ") || "—"}</div>
                              <div className="text-text/60">Preguntas</div>
                              <div>{s.items.length}</div>
                            </div>
                            <div className="border-t border-border p-2">
                              <button
                                onClick={() => openSession(s.sessionId)}
                                className="flex w-full items-center justify-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                              >
                                <Eye className="h-4 w-4" /> Ver respuestas
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {!sessionsFiltered.length && (
                        <div className="rounded-lg border border-border p-4 text-center text-sm text-text/60">
                          {loading ? "Cargando…" : "Sin resultados."}
                        </div>
                      )}
                    </div>

                    {/* Desktop tabla */}
                    <div className="hidden overflow-auto rounded-lg border border-border md:block">
                      <table className="min-w-full text-xs">
                        <thead className="bg-muted/40">
                          <tr className="text-left text-text/60">
                            <th className="p-2">Sesión</th>
                            <th>Persona</th>
                            <th>Estado</th>
                            <th>Última</th>

                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessionsFiltered.map((s) => {
                            const status = s.status?.toLowerCase();
                            return (
                              <tr key={s.sessionId} className="border-b border-border last:border-0">
                                <td className="p-2 font-mono text-xs text-text/70">{s.sessionId.slice(0, 8)}</td>
                                <td>{s.name}</td>
                                <td>
                                  {status === "completed" ? (
                                    <span className="text-emerald-600 font-medium">Completada</span>
                                  ) : status === "in_progress" ? (
                                    <span className="text-amber-600 font-medium">En progreso</span>
                                  ) : (
                                    <span className="text-text/60">{s.status}</span>
                                  )}
                                </td>
                                <td className="text-xs text-text/60">{s.last ? s.last.slice(0, 16).replace("T", " ") : "—"}</td>
                                <td>
                                  <button
                                    className="flex w-full items-center justify-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                                    onClick={() => openSession(s.sessionId)}
                                  >
                                    <Eye className="h-4 w-4" /> Ver
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {!sessionsFiltered.length && (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-text/50">
                                {loading ? "Cargando…" : "Sin resultados."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!assignmentsFiltered.length && (
            <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-text/60">
              No hay asignaciones con los filtros.
            </div>
          )}
        </div>
      )}

      {/* Modo estudiantes */}
      {studentMode && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Buscar usuarios</h2>
            <button
              onClick={() => {
                // recarga con el query actual
                searchStudents(studentQuery);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
            >
              <RotateCw className="h-3.5 w-3.5" /> Recargar
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 mb-4">
            <Search className="h-4 w-4 text-text/50" />
            <input
              placeholder="Nombre, apellido, ID o email…"
              value={studentQuery}
              onChange={(e) => {
                setStudentQuery(e.target.value);
                setStudentSelected(null);
                setStudentRows([]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") searchStudents(studentQuery);
              }}
              className="h-9 w-full bg-transparent text-sm outline-none"
            />
            <button
              onClick={() => searchStudents(studentQuery)}
              className="ml-2 inline-flex h-7 items-center rounded-md bg-primary px-3 text-xs text-white hover:bg-primary/90"
            >
              Buscar
            </button>
          </div>

            {!studentSelected && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {studentLoading && (
                  <div className="col-span-full rounded-lg border border-border bg-muted/40 p-6 text-center text-sm">
                    Cargando usuarios...
                  </div>
                )}
                {!studentLoading &&
                  studentIndex.slice(0, 60).map((s) => {
                    const full = [s.first_names, s.last_names].filter(Boolean).join(" ") || "—";
                    return (
                      <button
                        key={s.profile_id}
                        onClick={() => setStudentSelected(s)}
                        className="group rounded-lg border border-border bg-surface p-4 text-left hover:bg-muted/50"
                      >
                        <div className="font-medium truncate">{full}</div>
                        <div className="mt-1 text-xs text-text/60 break-all font-mono">
                          ID institucional: {s.institution_id ?? "—"}
                        </div>
                        <div className="mt-2 text-[11px] text-primary/70 group-hover:text-primary">
                          Ver asignaciones →
                        </div>
                      </button>
                    );
                  })}
                {!studentLoading && !studentIndex.length && (
                  <div className="col-span-full rounded-lg border border-border bg-muted/30 p-6 text-center text-sm text-text/60">
                    Sin coincidencias. Usa el botón Buscar.
                  </div>
                )}
              </div>
            )}

          {studentSelected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Usuario: {[studentSelected.first_names, studentSelected.last_names].filter(Boolean).join(" ") || "—"}
                </h3>
                <button
                  onClick={() => {
                    setStudentSelected(null);
                    setStudentRows([]);
                  }}
                  className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  Regresar
                </button>
              </div>

              {studentRowsLoading && (
                <div className="rounded-lg border border-border bg-muted/40 p-4 text-center text-sm">
                  Cargando respuestas…
                </div>
              )}

              {!studentRowsLoading && !studentAssignments.length && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-center text-sm text-text/60">
                  Sin asignaciones para este usuario.
                </div>
              )}

              {studentAssignments.map((a) => (
                <div key={a.assignment_id} className="rounded-lg border border-border bg-surface">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">{a.survey_name}</div>
                      {/* Se quita el contador de sesiones solicitado */}
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {a.sessions.map((s) => {
                      const completed = s.status.toLowerCase() === "completed";
                      return (
                        <div key={s.session_id} className="flex items-center justify-between px-4 py-2">
                          <div className="flex flex-col min-w-0">
                            {(() => {
                              const meta = sessionMeta[s.session_id];
                              const dt = meta?.submitted_at || meta?.started_at || s.last;
                              const datePart = dt ? dt.slice(0, 16).replace("T", " ") : "Sin fecha";
                              const survey = assignmentNames[a.assignment_id] || a.survey_name || (s.items.length ? (s.items[0].survey_name || "Cuestionario") : "Cuestionario");
                              return (
                                <span className="text-sm font-medium truncate">
                                  {survey}
                                  <span className="ml-1 text-xs text-text/60">· {datePart}</span>
                                </span>
                              );
                            })()}
                            <span className={`text-xs mt-0.5 ${completed ? "text-emerald-600 font-medium" : "text-text/60"}`}>
                              {completed ? "Completada" : s.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span>Preguntas: {s.items.length}</span>
                            <button
                              onClick={() => openSession(s.session_id)}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted"
                            >
                              <Eye className="h-3.5 w-3.5" /> Ver
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Panel lateral respuestas */}
      {sessionPanel && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40"
          onClick={() => setSessionPanel(null)}
        >
          <div
            className="relative flex h-full w-full max-w-xl flex-col border-l border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSessionPanel(null)}
              className="absolute right-3 top-3 rounded-md border border-border bg-surface px-2 py-1 text-xs hover:bg-muted"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="border-b border-border px-5 py-5 pr-14">
              {(() => {
                const status = (sessionPanel.items[0]?.session_status || "").toLowerCase();
                const completed = status === "completed";
                const last = sessionPanel.items.reduce<string | null>((acc, r) => {
                  if (r.response_date && (!acc || r.response_date > acc)) return r.response_date;
                  return acc;
                }, null);
                const dateShow = last ? last.slice(0, 16).replace("T", " ") : "Sin fecha";
                return (
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold leading-tight">{sessionPanel.survey}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text/60">
                      <span className="font-medium text-text/70">{sessionPanel.name}</span>
                      <span>· {dateShow}</span>
                      {completed && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          Completada
                        </span>
                      )}
                      {!completed && status && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          {status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex-1 space-y-3 overflow-auto p-5">
              {sessionPanel.items
                .sort((a, b) => a.question_id - b.question_id)
                .map((r) => (
                  <div
                    key={r.question_id}
                    className="rounded-lg border border-border bg-gradient-to-br from-muted/40 to-muted/10 p-4"
                  >
                    <div className="mb-2 text-xs font-semibold">{r.question_text}</div>
                    <div className="whitespace-pre-wrap text-sm">
                      {typeof r.response_value?.text === "string" ? r.response_value.text : "—"}
                    </div>
                  </div>
                ))}
              {!sessionPanel.items.length && (
                <div className="text-center text-xs text-text/50">Sin respuestas.</div>
              )}
            </div>
            <div className="border-t border-border p-4">
              <button
                onClick={() => setSessionPanel(null)}
                className="w-full rounded-md border border-border bg-muted px-4 py-2 text-sm hover:bg-muted/70"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}