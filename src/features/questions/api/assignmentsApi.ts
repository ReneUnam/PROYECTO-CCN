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
  const { data, error } = await supabase.rpc("start_assignment", {
    p_assignment_id: assignmentId,
  });
  if (error) throw new Error(error.message);
  return data as string; // session_id (uuid)
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