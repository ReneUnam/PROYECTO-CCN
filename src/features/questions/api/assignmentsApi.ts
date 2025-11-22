// Borra todas las sesiones y respuestas de una asignación (admin)
export async function deleteAssignmentSessions(assignmentId: number) {
  const { error } = await supabase.rpc("delete_assignment_sessions", {
    p_assignment_id: assignmentId,
  });
  if (error) throw new Error(error.message);
}
// Obtiene todas las sesiones del usuario para una asignación, junto con el número de respuestas
export async function getUserSessionsWithResponses(assignmentId: number) {
  const user = await supabase.auth.getUser();
  const authUid = user.data.user?.id;
  if (!authUid) throw new Error("Usuario no autenticado");
  // Buscar el id de perfil real
  const { data: profile, error: errProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authUid)
    .maybeSingle();
  if (errProfile) throw new Error(errProfile.message);
  if (!profile) throw new Error("Perfil no encontrado para el usuario actual");
  const profileId = profile.id;
  // Solo sesiones completadas
  const { data: sessions, error: err1 } = await supabase
    .from("survey_sessions")
    .select("id, started_at, status, assignment_id, profile_id")
    .eq("assignment_id", assignmentId)
    .eq("profile_id", profileId)
    .eq("status", "completed")
    .order("started_at", { ascending: false });
  if (err1) throw new Error(err1.message);
  if (!sessions || !sessions.length) {
    return [];
  }
  // Para cada sesión, contar respuestas
  const result: { id: string; started_at: string; count: number }[] = [];
  for (const s of sessions) {
    const { count, error: err2 } = await supabase
      .from("responses")
      .select("id", { count: "exact", head: true })
      .eq("session_id", s.id);
    if (err2) throw new Error(err2.message);
    result.push({ id: s.id, started_at: s.started_at, count: count ?? 0 });
  }
  // Solo devolver las que tengan al menos una respuesta
  return result.filter(s => s.count > 0);
}
import { supabase } from "@/core/api/supabaseClient";

export type Assignment = {
  assignment_id: number;
  survey_id: number;
  survey_name: string;
  start_at: string | null;
  end_at: string | null;
  max_attempts: number;
  completed: number;
};

export async function getMyAssignments() {
  const { data, error } = await supabase.rpc("get_my_assignments");
  if (error) throw new Error(error.message);
  return (data || []) as Assignment[];
}

export async function startAssignment(assignmentId: number) {
  // Buscar el id de perfil real
  const user = await supabase.auth.getUser();
  const authUid = user.data.user?.id;
  if (!authUid) throw new Error("Usuario no autenticado");
  const { data: profile, error: errProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authUid)
    .maybeSingle();
  if (errProfile) throw new Error(errProfile.message);
  if (!profile) throw new Error("Perfil no encontrado para el usuario actual");
  const profileId = profile.id;
  // Buscar si ya existe una sesión para este usuario y asignación
  const { data: sessions, error: err1 } = await supabase
    .from("survey_sessions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("profile_id", profileId)
    .order("started_at", { ascending: false })
    .limit(1);
  if (err1) throw new Error(err1.message);
  if (sessions && sessions.length) {
    return sessions[0].id as string;
  }
  // Si no existe, crear una nueva sesión
  const { data, error } = await supabase.rpc("start_assignment", {
    p_assignment_id: assignmentId,
  });
  if (error) throw new Error(error.message);
  return data as string; // session_id (uuid)
}

// Obtiene la última sesión (más reciente) del usuario para una asignación ya completada
export async function getLastSessionId(assignmentId: number) {
  const user = await supabase.auth.getUser();
  const authUid = user.data.user?.id;
  if (!authUid) throw new Error("Usuario no autenticado");
  const { data: profile, error: errProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authUid)
    .maybeSingle();
  if (errProfile) throw new Error(errProfile.message);
  if (!profile) throw new Error("Perfil no encontrado para el usuario actual");
  const profileId = profile.id;
  // Buscar sesiones del usuario para la asignación, ordenadas por fecha descendente
  const { data: sessions, error: err1 } = await supabase
    .from("survey_sessions")
    .select("id, started_at")
    .eq("assignment_id", assignmentId)
    .eq("profile_id", profileId)
    .order("started_at", { ascending: false });
  if (err1) throw new Error(err1.message);
  if (!sessions || !sessions.length) return null;

  // Bloque de depuración: recolectar info de respuestas por sesión
  const debugSessionInfo: { id: string; started_at: string; count: number }[] = [];
  for (const s of sessions) {
    const { count, error: err2 } = await supabase
      .from("responses")
      .select("id", { count: "exact", head: true })
      .eq("session_id", s.id);
    if (err2) throw new Error(err2.message);
    debugSessionInfo.push({ id: s.id, started_at: s.started_at, count: count ?? 0 });
    if ((count ?? 0) > 0) {
      return s.id as string;
    }
  }
  return sessions[0].id as string;
}

export async function getAssignmentDetail(assignmentId: number) {
  const { data, error } = await supabase
    .rpc("get_assignment_detail", { p_assignment_id: assignmentId })
    .single();
  if (error) throw new Error(error.message);
  return data as {
    assignment_id: number;
    survey_id: number;
    survey_name: string;
    start_at: string | null;
    end_at: string | null;
  };
}

export async function getSurveyQuestions(surveyId: number) {
  const { data, error } = await supabase
    .from("questions")
    .select("id,text,order")
    .eq("surveys_id", surveyId)
    .order("order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((q) => ({ id: q.id as number, prompt: (q as any).text as string }));
}

export async function getSessionResponses(sessionId: string) {
  const { data, error } = await supabase
    .from("responses")
    .select("question_id,response_value")
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  // Map: question_id -> value(json)
  const map = new Map<number, any>();
  (data || []).forEach((r: any) => map.set(Number(r.question_id), r.response_value));
  return map;
}

export async function upsertResponse(args: {
  sessionId: string;
  questionId: number;
  value: { text: string };
}) {
  const { error } = await supabase.rpc("upsert_response", {
    p_session: args.sessionId,
    p_question_id: args.questionId,
    p_value: args.value,
  });
  if (error) throw new Error(error.message);
}

export async function completeSession(sessionId: string) {
  const { error } = await supabase.rpc("complete_session", { p_session: sessionId });
  if (error) throw new Error(error.message);
}

export async function createSurveyWithQuestionsAndAssign(args: {
  title: string;
  questions: string[];
  dueAt: string; // ISO
  audience: "all" | "students" | "teachers";
}) {
  const { error, data } = await supabase.rpc("create_survey_with_questions_and_assign", {
    p_title: args.title,
    p_questions: args.questions,
    p_due_at: args.dueAt,
    p_audience: args.audience,
  });
  if (error) throw new Error(error.message);
  return data as number; // assignment_id
}