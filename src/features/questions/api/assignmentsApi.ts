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
  if (error) throw error;
  return data as Assignment[];
}

export async function startAssignment(assignmentId: number) {
  const { data, error } = await supabase.rpc("start_assignment", { p_assignment_id: assignmentId });
  if (error) throw error;
  return data as string; // session uuid
}

export async function completeSession(sessionId: string) {
  const { error } = await supabase.rpc("complete_session", { p_session: sessionId });
  if (error) throw error;
}

export async function getAssignmentDetail(assignmentId: number) {
  const { data, error } = await supabase
    .from("survey_assignments")
    .select("id, survey_id, surveys:survey_id ( id, name )")
    .eq("id", assignmentId)
    .single();
  if (error) throw error;
  return {
    assignment_id: data.id as number,
    survey_id: (data as any).survey_id as number,
    survey_name: (data as any).surveys?.name as string,
  };
}

export async function getSurveyQuestions(surveyId: number) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, text, order")
    .eq("surveys_id", surveyId)
    .order("order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((q: any) => ({ id: Number(q.id), prompt: String(q.text) }));
}

export async function getSessionResponses(sessionId: string) {
  const { data, error } = await supabase
    .from("responses")
    .select("question_id, response_value")
    .eq("session_id", sessionId);
  if (error) throw error;
  const map = new Map<number, any>();
  (data ?? []).forEach((r: any) => map.set(Number(r.question_id), r.response_value));
  return map;
}

export async function upsertResponse(params: { sessionId: string; questionId: number; value: any }) {
  const { error } = await supabase.rpc("upsert_response", {
    p_session: params.sessionId,
    p_question_id: params.questionId,
    p_value: params.value,
  });
  if (error) throw error;
}

/**
 * Crea un survey, sus preguntas abiertas y la asignación (por defecto a todos).
 * audience: 'all' | 'students' | 'teachers'
 */
export async function createSurveyWithQuestionsAndAssign(params: {
  title: string;
  dueAt: string; // ISO o 'YYYY-MM-DDTHH:mm'
  questions: string[];
  audience?: "all" | "students" | "teachers";
}) {
  const audience = params.audience ?? "all";
  const roleMap = { teachers: 2, students: 3 } as const;

  // 1) Survey
  const { data: survey, error: e1 } = await supabase
    .from("surveys")
    .insert({ name: params.title })
    .select("id")
    .single();
  if (e1) throw e1;

  // 2) Preguntas (abiertas)
  if (params.questions.length) {
    const rows = params.questions.map((txt, i) => ({
      surveys_id: survey.id,
      text: txt,
      response_type: "open",
      order: i + 1,
    }));
    const { error: e2 } = await supabase.from("questions").insert(rows);
    if (e2) throw e2;
  }

  // 3) Asignación
  const payload: any = {
    survey_id: survey.id,
    target_type: audience === "all" ? "all" : "role",
    target_role_id: audience === "all" ? null : roleMap[audience],
    start_at: new Date().toISOString(),
    end_at: new Date(params.dueAt).toISOString(),
    max_attempts: 1, // sin límite de intentos “simultáneos”; se completa al enviar
  };
  const { data: assignment, error: e3 } = await supabase
    .from("survey_assignments")
    .insert(payload)
    .select("id")
    .single();
  if (e3) throw e3;

  return { assignmentId: assignment.id as number, surveyId: survey.id as number };
}