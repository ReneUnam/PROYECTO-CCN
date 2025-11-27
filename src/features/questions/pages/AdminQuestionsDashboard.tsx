import { useEffect, useMemo, useState, useRef } from "react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { supabase } from "@/core/api/supabaseClient";
import { DateField } from "@/core/components/DataField";
import { useToast } from "@/components/toast/ToastProvider";
import { useConfirm } from "@/components/confirm/ConfirmProvider";
import { adminDeleteSession, adminDeleteSessions, adminDeleteAssignment } from "@/features/questions/api/assignmentsApi";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Search,
  X,
  Trash,
  Users,
  RotateCw,
  BarChart3,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
  avatar_url?: string | null;
}

export default function AdminQuestionsDashboard() {
  const [overview, setOverview] = useState<Overview[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [filters, setFilters] = useState<Filters>({ q: "", status: "all", from: "", to: "" });
  const [draft, setDraft] = useState<Filters>(filters);
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");

  // Sesiones por asignación activa
  const [sessionPanel, setSessionPanel] = useState<{ id: string; name: string; survey: string; items: Row[] } | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [selectAllSessions, setSelectAllSessions] = useState(false);
  const [assignmentSessionIdsMap, setAssignmentSessionIdsMap] = useState<Map<number, string[]>>(new Map());
  const [assignmentSessionIdsLoadingMap, setAssignmentSessionIdsLoadingMap] = useState<Map<number, boolean>>(new Map());
  const assignmentSessionFetchPromises = useRef<Map<number, Promise<string[]>>>(new Map());
  const [selectAllGlobalLoading, setSelectAllGlobalLoading] = useState(false);
  const [allSelected, setAllSelected] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  // Modo estudiantes
  const [studentMode, setStudentMode] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentIndex, setStudentIndex] = useState<StudentIndex[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentSelected, setStudentSelected] = useState<StudentIndex | null>(null);
  const [studentRows, setStudentRows] = useState<Row[]>([]); // todas sus respuestas
  const [studentRowsLoading, setStudentRowsLoading] = useState(false);
  const [assignmentDeleteLoading, setAssignmentDeleteLoading] = useState<number | null>(null);
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
          .select("id, first_names, last_names, institution_id, email, avatar_url")
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
            avatar_url: r.avatar_url ?? null,
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
            .select("id,institution_id,avatar_url")
            .in("id", ids);
          if (!prof.error && prof.data) {
            (prof.data as any[]).forEach((p) => {
              const it = map.get(p.id);
              if (it) {
                it.institution_id = p.institution_id ?? null;
                it.avatar_url = p.avatar_url ?? null;
              }
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

  // Delete all sessions for an assignment (assignment-level delete button)
  async function handleDeleteAssignmentSessions(assignmentId: number) {
    const ids = Array.from(new Set(rows.filter((r) => r.assignment_id === assignmentId && r.session_id).map((r) => r.session_id ?? ""))).filter(Boolean) as string[];
    if (!ids.length) {
      toast.warning('No hay sesiones para esta asignación');
      return;
    }
    const anyDraft = rows.some((r) => r.assignment_id === assignmentId && (r.session_status ?? '').toLowerCase() !== 'completed');
    const ok = await requireDeleteConfirmation({ assignmentId, anyDraft, count: ids.length });
    if (!ok) return;
    try {
      setAssignmentDeleteLoading(assignmentId);
      const a = overview.find(x => x.assignment_id === assignmentId) ?? null;
      const force = !!a && ((a.recipients ?? 0) > (a.completed ?? 0));
      const { succeeded, failed } = await adminDeleteSessions(ids, force);
      if (succeeded.length) {
        setRows((prev) => prev.filter((r) => !succeeded.includes(r.session_id ?? '')));
        setStudentRows((prev) => prev.filter((r) => !succeeded.includes(r.session_id ?? '')));
        setSelectedSessionIds((prev) => { const next = new Set(prev); succeeded.forEach((id) => next.delete(id)); return next; });
        toast.success(`${succeeded.length} sesiones eliminadas`);
      }
      if (failed.length) {
        toast.error(`${failed.length} eliminaciones fallaron`);
        console.error('failed deletes', failed);
      }

      // If we successfully deleted all sessions for this assignment, also delete the assignment record
      if (succeeded.length === ids.length) {
        try {
          await adminDeleteAssignment(assignmentId, force);
          setOverview(prev => prev.filter(x => x.assignment_id !== assignmentId));
          setAssignmentSessionIdsMap(prev => { const next = new Map(prev); next.delete(assignmentId); return next; });
          // remove any selected ids that belonged to this assignment
          setSelectedSessionIds(prev => { const next = new Set(prev); Array.from(next).forEach(id => { const belongs = rows.some(r => r.assignment_id === assignmentId && r.session_id === id); if (belongs) next.delete(id); }); return next; });
          if (active === assignmentId) { setActive(null); setRows([]); }
          toast.success('Asignación eliminada');
        } catch (err) {
          console.error('delete assignment after sessions error', err);
          toast.error('Sesiones eliminadas, pero no fue posible eliminar la asignación');
        }
      }
    } catch (e) {
      console.error('handleDeleteAssignmentSessions error', e);
      toast.error('Error eliminando sesiones');
    } finally {
      setAssignmentDeleteLoading(null);
    }
  }

  // Add a new handler to delete assignments directly from the main view
  async function handleDeleteAssignmentClick(assignmentId: number) {
    const sessionIds = await getAssignmentSessionIds(assignmentId);
    const hasSessions = sessionIds.length > 0;

    if (!hasSessions) {
      const ok = await confirm({
        title: 'Eliminar asignación',
        message: `¿Eliminar la asignación? Esta acción eliminará la asignación. Escribe ELIMINAR para confirmar.`,
        confirmText: 'Eliminar',
        variant: 'danger',
        requireTextMatch: 'ELIMINAR',
      });
      if (!ok) return;

      try {
        const a = overview.find(x => x.assignment_id === assignmentId) ?? null;
        const force = !!a && ((a.recipients ?? 0) > (a.completed ?? 0));
        await adminDeleteAssignment(assignmentId, force);
        setOverview((prev) => prev.filter((x) => x.assignment_id !== assignmentId));
        toast.success('Asignación eliminada');
      } catch (err) {
        console.error('Error eliminando asignación', err);
        toast.error('Error eliminando asignación');
      }
      return;
    }

    const anyDraft = rows.some(
      (r) => r.assignment_id === assignmentId && (r.session_status ?? '').toLowerCase() !== 'completed'
    );
    const ok = await requireDeleteConfirmation({ assignmentId, anyDraft, count: sessionIds.length });
    if (!ok) return;

    try {
      const force = overview.some(
        (x) => x.assignment_id === assignmentId && (x.recipients ?? 0) > (x.completed ?? 0)
      );
      const { succeeded, failed } = await adminDeleteSessions(sessionIds, force);

      if (succeeded.length === sessionIds.length) {
        await adminDeleteAssignment(assignmentId, force);
        setOverview((prev) => prev.filter((x) => x.assignment_id !== assignmentId));
        toast.success('Asignación eliminada');
      } else {
        toast.error('Error eliminando sesiones');
      }
    } catch (err) {
      console.error('Error eliminando asignación', err);
      toast.error('Error eliminando asignación');
    }
  }

  // Carga overview
  useEffect(() => {
    setInitialLoading(true);
    supabase.from("v_assignments_overview").select("*").then(({ data }) => {
      setOverview(data || []);
      setInitialLoading(false);
    });
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

    // Helper: decide and show appropriate confirmation before deleting
    async function requireDeleteConfirmation(opts: { assignmentId?: number | null; anyDraft?: boolean; count?: number }) {
      const { assignmentId, anyDraft, count } = opts;

      if (anyDraft) {
        const ok = await confirm({
          title: 'Eliminar sesión',
          message: 'Una o más sesiones no están completadas. Escribe ELIMINAR para confirmar la eliminación.',
          confirmText: 'Eliminar',
          variant: 'danger',
          requireTextMatch: 'ELIMINAR',
        });
        return !!ok;
      }

      if (count === 1) {
        const ok = await confirm({
          title: 'Eliminar sesión',
          message: '¿Eliminar esta sesión completada?',
          confirmText: 'Eliminar',
          variant: 'danger',
        });
        return !!ok;
      }

      const ok = await confirm({
        title: 'Eliminar sesiones seleccionadas',
        message: `Se eliminarán ${count} sesiones. ¿Continuar?`,
        confirmText: 'Eliminar',
        variant: 'danger',
      });
      return !!ok;
    }

  // Sesiones agrupadas (asignación activa)
  const sessionsActive = useMemo(() => {
    const map = new Map<string, { name: string; status: string; last: string | null; items: Row[] }>();
    rows.forEach((r) => {
      const sid = r.session_id ?? "";
      if (!sid) return; // ignore rows without real session_id
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

  // Keep selectAllSessions state in sync with actual selectedSessionIds when active
  useEffect(() => {
    if (!active) { setSelectAllSessions(false); return; }
    const visible = sessionsFiltered.map(s => s.sessionId);
    if (!visible.length) { setSelectAllSessions(false); return; }
    const allSelected = visible.every(id => selectedSessionIds.has(id));
    setSelectAllSessions(allSelected);
  }, [active, sessionsFiltered, selectedSessionIds]);

  // memoized counts for selections
  const selectedInActive = useMemo(() => {
    return sessionsFiltered.filter((s) => selectedSessionIds.has(s.sessionId)).length;
  }, [sessionsFiltered, selectedSessionIds]);

  function countSelectedInAssignment(assignmentId?: number | null) {
    if (!assignmentId) return 0;
    const ids = assignmentSessionIdsMap.get(assignmentId) ?? rows.filter((r) => r.assignment_id === assignmentId && r.session_id).map((r) => r.session_id ?? "");
    if (!ids.length) return 0;
    return ids.filter((id) => selectedSessionIds.has(id)).length;
  }

  // student-specific counters (defined after studentAssignments below)

  // Sync global allSelected based on known ids in rows and cache
  useEffect(() => {
    const knownIds: Set<string> = new Set();
    rows.forEach(r => { if (r.session_id) knownIds.add(r.session_id); });
    assignmentSessionIdsMap.forEach((arr) => arr.forEach(id => { if (id) knownIds.add(id); }));
    const ids = [...knownIds];
    if (!ids.length) { setAllSelected(false); return; }
    const allSel = ids.every(id => selectedSessionIds.has(id));
    setAllSelected(allSel);
  }, [selectedSessionIds, assignmentSessionIdsMap, rows]);

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

  // Helper: get cached or fetched session ids for an assignment
  async function getAssignmentSessionIds(assignmentId: number) {
    const cached = assignmentSessionIdsMap.get(assignmentId);
    if (cached && cached.length) return cached;
    // try to get from rows if visible
    const fromRows = rows.filter(r => r.assignment_id === assignmentId && r.session_id).map(r => r.session_id ?? "");
    if (fromRows.length) {
      setAssignmentSessionIdsMap(prev => new Map(prev).set(assignmentId, fromRows));
      return fromRows;
    }
    // fetch from server, reuse in-flight requests
    const inflight = assignmentSessionFetchPromises.current.get(assignmentId);
    if (inflight) return await inflight;
    try {
      setAssignmentSessionIdsLoadingMap(prev => new Map(prev).set(assignmentId, true));
      // Use `survey_sessions` table to include sessions that still have no responses (empty sessions)
      const fetchPromise = (async () => {
        const { data, error } = await supabase.from('survey_sessions').select('id').eq('assignment_id', assignmentId);
        if (error) throw error;
        const ids = Array.from(new Set((data || []).map((d: any) => d.id).filter(Boolean)));
        setAssignmentSessionIdsMap(prev => new Map(prev).set(assignmentId, ids));
        return ids;
      })();
      assignmentSessionFetchPromises.current.set(assignmentId, fetchPromise);
      const ids = await fetchPromise;
      assignmentSessionFetchPromises.current.delete(assignmentId);
      return ids;
    } catch (err) {
      console.error('getAssignmentSessionIds fetch error', err);
      return [];
    } finally {
      setAssignmentSessionIdsLoadingMap(prev => new Map(prev).set(assignmentId, false));
    }
  }

  function countSelectedInStudentAssignment(aid: number) {
    // studentAssignments available in component; find by assignment id
    const a = studentAssignments.find((x) => x.assignment_id === aid);
    if (!a) return 0;
    return a.sessions.filter((s) => selectedSessionIds.has(s.session_id)).length;
  }

  const selectedInStudent = useMemo(() => {
    const ids = studentAssignments.flatMap(a => a.sessions.map(s => s.session_id)).filter(Boolean) as string[];
    return ids.filter((id) => selectedSessionIds.has(id)).length;
  }, [studentAssignments, selectedSessionIds]);

  // Select/deselect all visible/filtered sessions (global)
  async function handleSelectAllGlobal() {
    if (selectAllGlobalLoading) return;
    try {
      setSelectAllGlobalLoading(true);
      // Compute all ids we consider for global selection
      const toGather = assignmentsFiltered.map(a => a.assignment_id);
      const idsFromRows = new Set(rows.map(r => r.session_id).filter(Boolean) as string[]);
      const cachedIds = new Set<string>();
      assignmentSessionIdsMap.forEach((arr) => arr.forEach(id => { if (id) cachedIds.add(id); }));
      // Fetch assignment ids for assignments not in cache
      const toFetchAssignments = toGather.filter(aid => !(assignmentSessionIdsMap.get(aid) || []).length);
      // limit concurrency to avoid spikes when many assignments are fetched
      const fetched: string[] = [];
      const batchSize = 6; // adjust as needed
      for (let i = 0; i < toFetchAssignments.length; i += batchSize) {
        const chunk = toFetchAssignments.slice(i, i + batchSize);
        const results = await Promise.all(chunk.map((aid) => getAssignmentSessionIds(aid)));
        fetched.push(...results.flat());
      }
      const allIdsArr = Array.from(new Set([...Array.from(idsFromRows), ...Array.from(cachedIds), ...fetched].filter(Boolean) as string[]));
      if (!allIdsArr.length) {
        // nothing to toggle
        setSelectAllGlobalLoading(false);
        return;
      }
      const allIds = allIdsArr;
      const isAllSelected = allIds.every(id => selectedSessionIds.has(id));
      if (isAllSelected) {
        setSelectedSessionIds(new Set());
        setAllSelected(false);
      } else {
        setSelectedSessionIds(new Set(allIds));
        setAllSelected(true);
      }
    } catch (e) {
      console.error('handleSelectAllGlobal error', e);
      toast.error('Error seleccionando sesiones');
    } finally {
      setSelectAllGlobalLoading(false);
    }
  }

  const [openSessionLoading, setOpenSessionLoading] = useState<string | null>(null);
  const openSessionPromisesRef = useRef(new Map<string, Promise<void>>());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  async function openSession(sessionId: string) {
    // reuse in-flight openSession promises to avoid duplicate fetches
    const inflight = openSessionPromisesRef.current.get(sessionId);
    if (inflight) return await inflight;
    if (openSessionLoading === sessionId) return;
    const p = (async () => {
      try {
        setOpenSessionLoading(sessionId);
        let source: Row[] | undefined = rows.filter((r) => r.session_id === sessionId);
      if (!source?.length && studentSelected) {
        source = studentRows.filter((r) => r.session_id === sessionId);
      }
      // If not found locally, fetch from v_assignment_responses to get rows (including empty sessions won't return rows but we can still try to get session meta below)
      if (!source?.length) {
        const { data, error } = await supabase.from('v_assignment_responses').select('*').eq('session_id', sessionId);
        if (error) throw error;
        if (data && data.length) source = data as Row[];
      }
      // If still not found, try to fetch session meta (empty session) from survey_sessions and populate minimal structure
      if (!source?.length) {
        const { data: ss, error: ssErr } = await supabase.from('survey_sessions').select('id, assignment_id, status').eq('id', sessionId).maybeSingle();
        if (ssErr) throw ssErr;
        if (!ss) {
          toast.warning('No se encontró la sesión');
          return;
        }
        // build a minimal item to show basic info
        const fake: Row = {
          assignment_id: ss.assignment_id as number,
          survey_name: assignmentNames[ss.assignment_id] || 'Cuestionario',
          question_id: 0,
          question_text: 'Sin respuestas',
          session_id: ss.id,
          session_status: ss.status,
          response_value: null,
          response_date: null,
          first_names: null,
          last_names: null,
        } as Row;
        source = [fake];
      }
      if (!source.length) {
        // nothing to show
        toast.warning('No hay respuestas para esta sesión.');
        return;
      }
      const name = [source[0].first_names, source[0].last_names].filter(Boolean).join(' ') || '—';
      const survey = assignmentNames[source[0].assignment_id] || source[0].survey_name || 'Cuestionario';
      setSessionPanel({ id: sessionId, name, survey, items: source });
    } catch (err) {
      console.error('openSession error', err);
      toast.error('No fue posible abrir la sesión');
    } finally {
      setOpenSessionLoading(null);
    }
    })();
    openSessionPromisesRef.current.set(sessionId, p);
    try {
      await p;
    } finally {
      openSessionPromisesRef.current.delete(sessionId);
    }
  }

  // Bulk delete selected sessions handler
  async function handleBulkDeleteSelected() {
    if (bulkDeleteLoading) return;
    setBulkDeleteLoading(true);
    const ids = Array.from(selectedSessionIds);
    if (!ids.length) return;
    // collect assignment ids and check pending / drafts
    const assignmentIds = Array.from(new Set(ids.map(id => rows.find(r => r.session_id === id)?.assignment_id).filter(Boolean) as number[]));
    const pendingParents = assignmentIds.filter(aid => {
      const a = overview.find(x => x.assignment_id === aid);
      return !!a && (a.recipients ?? 0) > (a.completed ?? 0);
    });
    const anyDraft = ids.some(id => rows.find(r => r.session_id === id)?.session_status?.toLowerCase() !== 'completed');
    if (pendingParents.length || anyDraft) {
      const ok = await confirm({
        title: 'Eliminar sesiones seleccionadas',
        message: `Se eliminarán ${ids.length} sesiones. ${pendingParents.length ? 'Una o más asignaciones tienen destinatarios pendientes. ' : ''}${anyDraft ? 'Una o más sesiones están incompletas.' : ''} Escribe ELIMINAR para confirmar.`,
        confirmText: 'Eliminar',
        variant: 'danger',
        requireTextMatch: 'ELIMINAR',
      });
      if (!ok) return;
    } else {
      const ok = await confirm({ title: 'Eliminar sesiones seleccionadas', message: `Se eliminarán ${ids.length} sesiones. ¿Continuar?`, confirmText: 'Eliminar', variant: 'danger' });
      if (!ok) return;
    }
    try {
      const force = pendingParents.length > 0; // force if parent pending
      const { succeeded, failed } = await adminDeleteSessions(ids, force);
      if (succeeded.length) {
        setRows(prev => prev.filter(r => !succeeded.includes(r.session_id ?? '')));
        setStudentRows(prev => prev.filter(r => !succeeded.includes(r.session_id ?? '')));
        setSelectedSessionIds(prev => { const next = new Set(prev); succeeded.forEach(id => next.delete(id)); return next; });
        toast.success(`${succeeded.length} sesiones eliminadas`);
      }
      if (failed.length) {
        toast.error(`${failed.length} eliminaciones fallaron`);
        console.error('failed deletes', failed);
      }
    } catch (e) {
      console.error('bulk delete selected sessions error', e);
      toast.error('Error eliminando sesiones');
    }
    finally {
      setBulkDeleteLoading(false);
    }
  }

  // Lista actual de estudiantes proviene del último fetch; se muestra tal cual

  if (initialLoading) return <FullScreenLoader />;

  return (
    <div className="mx-auto max-w-7xl p-4 text-text">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">

        <div className="mb-3 flex items-center gap-3">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[color:var(--color-primary)] text-white shadow-sm" aria-hidden="true">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Resultados de preguntas</h1>
            <p className="text-sm text-text/70">
              Filtra, ordena, busca usuarios y revisa respuestas por sesión.
            </p>
          </div>
        </div>
          <div className="flex gap-2 items-center">
          {!studentMode && (
            <>
            <button
              onClick={handleSelectAllGlobal}
              className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm ${allSelected ? 'bg-primary text-white' : 'bg-surface hover:bg-muted'}`}
              disabled={selectAllGlobalLoading}
              title={allSelected ? 'Deseleccionar todas las sesiones' : 'Seleccionar todas las sesiones'}
            >
              {selectAllGlobalLoading ? '...' : (allSelected ? 'Deseleccionar todo' : 'Seleccionar todo')}
            </button>
            {selectedSessionIds.size > 0 && (
              <button
                onClick={() => handleBulkDeleteSelected()}
                disabled={bulkDeleteLoading}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                <Trash className="h-4 w-4" />
                {bulkDeleteLoading ? '...' : `Borrar seleccionadas (${selectedSessionIds.size})`}
              </button>
            )}
            </>
          )}
          <button
            onClick={() => {
              // toggle student mode and clear session selection so session buttons do not persist
              setStudentMode((v) => !v);
              setStudentSelected(null);
              setStudentQuery("");
              setSelectedSessionIds(new Set());
              setAllSelected(false);
              // close assignment panel when switching modes
              setActive(null);
              setRows([]);
            }}
            className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm border border-border ${studentMode ? "bg-primary text-white" : "bg-surface hover:bg-muted"
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
                className={`h-9 px-3 text-sm ${sortOrder === "recent" ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
                  }`}
              >
                Recientes
              </button>
              <button
                onClick={() => setSortOrder("old")}
                className={`h-9 px-3 text-sm border-l border-border ${sortOrder === "old" ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
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
            const hasSessions = (rows.some((r) => r.assignment_id === o.assignment_id && r.session_id) || ((assignmentSessionIdsMap.get(o.assignment_id) || []).length > 0));
            return (
              <div key={o.assignment_id} className="rounded-xl border border-border bg-surface">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                      // Only prevent accordion toggle when clicking *interactive* controls
                      // (buttons, inputs, anchors, selects, textareas or labels). Do not block
                      // when the click is on the header element itself, which has role='button'.
                      const el = e.target as HTMLElement;
                      if (el.closest('button,input,a,select,textarea,label')) return;
                      setActive(isActive ? null : o.assignment_id);
                      setPersonQ("");
                    }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActive(isActive ? null : o.assignment_id);
                      setPersonQ("");
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-t-xl px-4 py-3 text-left cursor-pointer"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <input
                      type="checkbox"
                      title="Seleccionar todas las sesiones de esta asignación"
                      onClick={(e) => e.stopPropagation()}
                      checked={(() => {
                        const ids = assignmentSessionIdsMap.get(o.assignment_id) ?? rows.filter(r => r.assignment_id === o.assignment_id && r.session_id).map(r => r.session_id ?? "");
                        if (!ids.length) return false;
                        return ids.every(id => selectedSessionIds.has(id));
                      })()}
                      disabled={assignmentSessionIdsLoadingMap.get(o.assignment_id) === true}
                      onChange={async (e) => {
                        const checked = e.target.checked;
                        const cached = (assignmentSessionIdsMap.get(o.assignment_id) ?? rows.filter(r => r.assignment_id === o.assignment_id && r.session_id).map(r => r.session_id ?? "")) as string[];
                        // optimistic update
                        setSelectedSessionIds(prev => {
                          const next = new Set(prev);
                          if (checked) cached.forEach(id => next.add(id));
                          else cached.forEach(id => next.delete(id));
                          return next;
                        });
                        // fetch and apply full set
                        const ids = (await getAssignmentSessionIds(o.assignment_id)) as string[];
                        setSelectedSessionIds(prev => {
                          const next = new Set(prev);
                          if (checked) ids.forEach(id => next.add(id));
                          else ids.forEach(id => next.delete(id));
                          return next;
                        });
                        // update selectAllSessions if this assignment is active
                        if (active === o.assignment_id) setSelectAllSessions(checked);
                      }}
                      className="h-4 w-4"
                    />
                    <div className="font-medium break-words whitespace-normal" title={o.survey_name}>{o.survey_name}</div>
                    <div className="mt-0.5 text-xs text-text/60">
                      Inicio: {o.start_at?.slice(0, 16).replace("T", " ") || "—"} · Vence:{" "}
                      {o.end_at?.slice(0, 16).replace("T", " ") || "—"}
                    </div>
                  </div>
                  <div className="hidden items-center gap-6 text-xs sm:flex">
                    <span>Destinatarios: {o.recipients}</span>
                    <span>Iniciadas: {o.started}</span>
                    <span>Completadas: {o.completed}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAssignmentClick(o.assignment_id);
                      }}
                      disabled={assignmentDeleteLoading === o.assignment_id}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                      title="Eliminar asignación"
                    >
                      <Trash className="h-3.5 w-3.5" />
                      <span className="sr-only">Eliminar asignación</span>
                    </button>
                    {/* single delete-assignment button kept here (dup removed) */}
                    {isActive ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:hidden">
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      {o.completed}/{o.recipients}
                    </span>
                    {/* Mobile-only delete button - shows only on small screens */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteAssignmentClick(o.assignment_id); }}
                      disabled={assignmentDeleteLoading === o.assignment_id}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                      title="Eliminar asignación"
                    >
                      <Trash className="h-3.5 w-3.5" />
                      <span className="sr-only">Eliminar asignación</span>
                    </button>
                    {/* mobile delete button removed to avoid duplicate with desktop button */}
                    {isActive ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </div>

                {isActive && (
                  <div className="px-4 pb-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                      <div className="flex items-center gap-3">
                                        <button onClick={() => {
                                          // toggle select all visible sessions
                                          if (!selectAllSessions) {
                                            setSelectedSessionIds(new Set(sessionsFiltered.map(s => s.sessionId)));
                                            setSelectAllSessions(true);
                                          } else {
                                            setSelectedSessionIds(new Set());
                                            setSelectAllSessions(false);
                                          }
                                        }} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">{selectAllSessions ? 'Deseleccionar' : 'Seleccionar todo'}</button>
                                        <h3 className="text-sm font-semibold">Sesiones</h3>
                                        {selectedInActive > 0 && <span className="text-xs text-text/60">· {selectedInActive} seleccionadas</span>}
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={exportExcel}
                                          disabled={!rows.length}
                                          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-white hover:bg-primary/90 disabled:opacity-50"
                                        >
                                          <Download className="h-3.5 w-3.5" /> Excel
                                        </button>
                                        <button
                                          onClick={async () => {
                                            // bulk delete selected sessions
                                            if (!selectedSessionIds.size) return;
                                            const ids = Array.from(selectedSessionIds);
                                            const anyDraft = sessionsFiltered.some(s => ids.includes(s.sessionId) && s.status.toLowerCase() !== 'completed');
                                                const ok = await requireDeleteConfirmation({ assignmentId: active ?? null, anyDraft, count: ids.length });
                                                if (!ok) return;
                                            try {
                                              const a = overview.find(x => x.assignment_id === active) ?? null;
                                              const force = !!a && ((a.recipients ?? 0) > (a.completed ?? 0));
                                              const { succeeded, failed } = await adminDeleteSessions(ids, force);
                                              if (succeeded.length) {
                                                setRows(prev => prev.filter(r => !succeeded.includes(r.session_id ?? '')));
                                                setSelectedSessionIds(prev => { const next = new Set(prev); succeeded.forEach(id => next.delete(id)); return next; });
                                                toast.success(`${succeeded.length} sesiones eliminadas`);
                                              }
                                              if (failed.length) {
                                                toast.error(`${failed.length} eliminaciones fallaron`);
                                                console.error('failed deletes', failed);
                                              }
                                              setSelectAllSessions(false);
                                            } catch (e) {
                                              console.error('bulk delete sessions error', e);
                                              toast.error('Error eliminando sesiones');
                                            }
                                          }}
                                          disabled={selectedSessionIds.size === 0}
                                          className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50"
                                        >
                                          Borrar seleccionadas
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
                      {/* (dup removed) */}
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
                          <div key={s.sessionId} className="rounded-lg border border-border" onClick={() => openSession(s.sessionId)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { openSession(s.sessionId); } }}>
                            <div className="flex items-center justify-between border-b border-border px-3 py-2">
                              <div className="text-xs text-text/60">Sesión</div>
                              <div className="text-xs font-mono">{s.sessionId.slice(0, 8)}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-3 text-sm">
                              <div className="text-text/60">Persona</div>
                              <div className="break-words whitespace-normal" title={s.name}>{s.name}</div>
                              <div className="text-text/60">Estado</div>
                              <div className={statusClass}>{statusLabel}</div>
                              <div className="text-text/60">Última</div>
                              <div>{s.last?.slice(0, 16).replace("T", " ") || "—"}</div>
                              <div className="text-text/60">Preguntas</div>
                              <div>{s.items.length}</div>
                            </div>
                            <div className="border-t border-border p-2">
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openSession(s.sessionId); }}
                                  disabled={openSessionLoading === s.sessionId}
                                  className={`flex-1 items-center justify-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted ${openSessionLoading === s.sessionId ? 'opacity-50 pointer-events-none' : ''}`}
                                  aria-busy={openSessionLoading === s.sessionId}
                                >
                                  {openSessionLoading === s.sessionId ? (
                                    <span className="text-xs">Cargando…</span>
                                  ) : (
                                    <><Eye className="h-4 w-4" /> Ver respuestas</>
                                  )}
                                </button>
                                <button
                                  onClick={async (ev) => {
                                    ev.stopPropagation();
                                    const anyDraft = s.status?.toLowerCase() !== 'completed';
                                    const assignmentId = rows.find(r => r.session_id === s.sessionId)?.assignment_id ?? null;
                                    const ok = await requireDeleteConfirmation({ assignmentId, anyDraft });
                                    if (!ok) return;
                                    try {
                                      // compute whether parent assignment has pending recipients (force)
                                      const aid = rows.find(r => r.session_id === s.sessionId)?.assignment_id ?? null;
                                      const a = aid ? overview.find(x => x.assignment_id === aid) : null;
                                      const force = !!a && ((a.recipients ?? 0) > (a.completed ?? 0));
                                      await adminDeleteSession(s.sessionId, force);
                                      setRows(prev => prev.filter(r => r.session_id !== s.sessionId));
                                      setSelectedSessionIds(prev => { const next = new Set(prev); next.delete(s.sessionId); return next; });
                                      toast.success('Sesión eliminada');
                                    } catch (e) {
                                      console.error('delete session error', e);
                                      toast.error('Error eliminando sesión');
                                    }
                                  }}
                                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100"
                                >
                                  Borrar
                                </button>
                              </div>
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
                              <tr key={s.sessionId} className="border-b border-border last:border-0" role="button" tabIndex={0} onClick={(e) => { const el = e.target as HTMLElement; if (el.closest('input,button,a,select,textarea,label')) return; openSession(s.sessionId); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { openSession(s.sessionId); } }}>
                                <td className="p-2 font-mono text-xs text-text/70">
                                  <input type="checkbox" onClick={(e) => e.stopPropagation()} checked={selectedSessionIds.has(s.sessionId)} onChange={(e) => {
                                    setSelectedSessionIds(prev => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(s.sessionId); else next.delete(s.sessionId);
                                      return next;
                                    });
                                  }} />
                                  <span className="ml-2">{s.sessionId.slice(0, 8)}</span>
                                </td>
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
                                <td className="flex gap-2">
                                  <button
                                  className={`flex items-center justify-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted ${openSessionLoading === s.sessionId ? 'opacity-50 pointer-events-none' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); openSession(s.sessionId); }}
                                    disabled={openSessionLoading === s.sessionId}
                                  >
                                    <Eye className="h-4 w-4" /> Ver
                                  </button>
                                  <button
                                    onClick={async (ev) => { ev.stopPropagation();
                                      const anyDraft = s.status?.toLowerCase() !== 'completed';
                                      try {
                                        const assignmentId = rows.find(r => r.session_id === s.sessionId)?.assignment_id ?? null;
                                        const ok = await requireDeleteConfirmation({ assignmentId, anyDraft });
                                        if (!ok) return;
                                        const aid = rows.find(r => r.session_id === s.sessionId)?.assignment_id ?? null;
                                        const a = aid ? overview.find(x => x.assignment_id === aid) : null;
                                        const force = !!a && ((a.recipients ?? 0) > (a.completed ?? 0));
                                        await adminDeleteSession(s.sessionId, force);
                                        setRows(prev => prev.filter(r => r.session_id !== s.sessionId));
                                        setSelectedSessionIds(prev => { const next = new Set(prev); next.delete(s.sessionId); return next; });
                                        toast.success('Sesión eliminada');
                                      } catch (e) {
                                        console.error('delete session error', e);
                                        toast.error('Error eliminando sesión');
                                      }
                                    }}
                                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100"
                                  >
                                    Borrar
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
            <div className="mb-3 flex items-center gap-3">
              <Users className="h-6 w-6" />
              <h2 className="text-lg font-semibold">Buscar usuarios</h2>
             </div>
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
                        className="group rounded-lg border border-border bg-surface p-4 text-left hover:bg-muted/50 flex items-center gap-4"
                      >
                        <Avatar className="h-10 w-10">
                          {s.avatar_url ? (
                            <AvatarImage src={s.avatar_url} alt={full} />
                          ) : (
                            <AvatarFallback>{(s.first_names ?? "")[0] || (s.last_names ?? "")[0] || "U"}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium break-words whitespace-normal" title={full}>{full}</div>
                          <div className="mt-1 text-xs text-text/60 break-all font-mono">ID institucional: {s.institution_id ?? "—"}</div>
                          <div className="mt-2 text-[11px] text-primary/70 group-hover:text-primary">Ver asignaciones →</div>
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
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        // toggle select all sessions for this student's visible sessions
                        const ids = studentAssignments.flatMap(a => a.sessions.map(s => s.session_id));
                        if (!selectAllSessions) {
                          setSelectedSessionIds(new Set(ids));
                          setSelectAllSessions(true);
                        } else {
                          // deselect only these
                          setSelectedSessionIds(prev => {
                            const next = new Set(prev);
                            ids.forEach(id => next.delete(id));
                            return next;
                          });
                          setSelectAllSessions(false);
                        }
                      }}
                      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                    >
                      {selectAllSessions ? "Deseleccionar" : "Seleccionar todo"}
                    </button>
                    {selectedInStudent > 0 && (
                      <span className="text-xs text-text/60">· {selectedInStudent} seleccionadas</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const ids = Array.from(selectedSessionIds);
                        if (!ids.length) return;
                        // determine if any selected session is not completed
                        const allSessions = studentAssignments.flatMap(a => a.sessions);
                        const anyDraft = allSessions.some(s => ids.includes(s.session_id) && s.status.toLowerCase() !== 'completed');
                                            // check if any parent assignment has pending recipients
                                            const assignmentIds = Array.from(new Set(ids.map(id => rows.find(r => r.session_id === id)?.assignment_id).filter(Boolean) as number[]));
                                            let requiresTyped = false;
                                            for (const aid of assignmentIds) {
                                              const a = overview.find(x => x.assignment_id === aid);
                                              if (a && (a.recipients ?? 0) > (a.completed ?? 0)) { requiresTyped = true; break; }
                                            }
                                            const ok = await requireDeleteConfirmation({ anyDraft, count: ids.length, assignmentId: assignmentIds[0] ?? null });
                                            if (!ok) return;
                        try {
                          const force = requiresTyped;
                          const { succeeded, failed } = await adminDeleteSessions(ids, force);
                          if (succeeded.length) {
                            setStudentRows(prev => prev.filter(r => !succeeded.includes(r.session_id ?? '')));
                            setRows(prev => prev.filter(r => !succeeded.includes(r.session_id ?? '')));
                            setSelectedSessionIds(prev => { const next = new Set(prev); succeeded.forEach(id => next.delete(id)); return next; });
                            toast.success(`${succeeded.length} sesiones eliminadas`);
                          }
                          if (failed.length) {
                            toast.error(`${failed.length} eliminaciones fallaron`);
                            console.error('failed deletes', failed);
                          }
                        } catch (e) {
                          console.error('bulk delete student sessions error', e);
                          toast.error('Error eliminando sesiones');
                        }
                      }}
                      disabled={selectedSessionIds.size === 0}
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      Borrar seleccionadas
                    </button>
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
                </div>
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
                          <div key={s.session_id} className="flex items-center justify-between px-4 py-2" role="button" tabIndex={0} onClick={() => openSession(s.session_id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { openSession(s.session_id); } }}>
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                onClick={(ev) => ev.stopPropagation()}
                                checked={selectedSessionIds.has(s.session_id)}
                                onChange={(e) => {
                                  setSelectedSessionIds(prev => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(s.session_id); else next.delete(s.session_id);
                                    return next;
                                  });
                                }}
                              />
                              <div className="flex flex-col">
                                {(() => {
                                  const meta = sessionMeta[s.session_id];
                                  const dt = meta?.submitted_at || meta?.started_at || s.last;
                                  const datePart = dt ? dt.slice(0, 16).replace("T", " ") : "Sin fecha";
                                  const survey = assignmentNames[a.assignment_id] || a.survey_name || (s.items.length ? (s.items[0].survey_name || "Cuestionario") : "Cuestionario");
                                  return (
                                    <span className="text-sm font-medium break-words whitespace-normal" title={survey}>
                                      {survey}
                                      <span className="ml-1 text-xs text-text/60">· {datePart}</span>
                                    </span>
                                  );
                                })()}
                                <span className={`text-xs mt-0.5 ${completed ? "text-emerald-600 font-medium" : "text-text/60"}`}>
                                  {completed ? "Completada" : s.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              <span>Preguntas: {s.items.length}</span>
                              <button
                                onClick={(ev) => { ev.stopPropagation(); openSession(s.session_id); }}
                                disabled={openSessionLoading === s.session_id}
                                className={`inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted ${openSessionLoading === s.session_id ? 'opacity-50 pointer-events-none' : ''}`}
                              >
                                {openSessionLoading === s.session_id ? (
                                  <span className="text-xs">Cargando…</span>
                                ) : (
                                  <><Eye className="h-3.5 w-3.5" /> Ver</>
                                )}
                              </button>
                              <button
                                onClick={async (ev) => { ev.stopPropagation();
                                  const anyDraft = s.status.toLowerCase() !== 'completed';
                                  try {
                                    const assignmentId = a.assignment_id;
                                    const aInfo = overview.find(x => x.assignment_id === assignmentId) ?? null;
                                    const force = !!aInfo && ((aInfo.recipients ?? 0) > (aInfo.completed ?? 0));
                                    const ok = await requireDeleteConfirmation({ assignmentId, anyDraft });
                                    if (!ok) return;
                                    await adminDeleteSession(s.session_id, force);
                                    // remove from studentRows and rows states
                                    setStudentRows(prev => prev.filter(r => r.session_id !== s.session_id));
                                    setRows(prev => prev.filter(r => r.session_id !== s.session_id));
                                    setSelectedSessionIds(prev => { const next = new Set(prev); next.delete(s.session_id); return next; });
                                    toast.success('Sesión eliminada');
                                  } catch (e) {
                                    console.error('delete session error', e);
                                    toast.error('Error eliminando sesión');
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-600 hover:bg-red-100"
                              >
                                Borrar
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