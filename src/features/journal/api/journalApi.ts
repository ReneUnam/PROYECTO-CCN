import { supabase } from "@/core/api/supabaseClient";


export type JournalType = "emotions" | "self-care";
export type JournalItemPatch = {
  id: string;
  scale_min?: number | null;
  scale_max?: number | null;
  scale_labels?: string[] | null;
  // ...otros campos de item...
};
async function getMyProfileIdSafe(): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();
  if (error) throw error;
  return data.id as string;
}

// Finaliza la entrada y actualiza racha con upsert por (profile_id,type)
export async function finalizeEntryAndStreak(entryId: string, type: JournalType) {
  const todayISO = new Date().toISOString();
  const today = todayISO.slice(0, 10);

  // Marca la entrada como completada y obtiene profile_id
  const { data: entry, error: e1 } = await supabase
    .from("journal_entries")
    .update({ status: "completed", completed_at: todayISO, entry_date: today })
    .eq("id", entryId)
    .select("id, profile_id, entry_date")
    .single();
  if (e1) throw e1;

  const profile_id = entry.profile_id;

  // Leer racha actual por (profile_id,type)
  const { data: s, error: e2 } = await supabase
    .from("journal_streaks")
    .select("current_streak, best_streak, last_entry_date")
    .eq("profile_id", profile_id)
    .eq("type", type)
    .maybeSingle();
  if (e2) throw e2;

  // Calcular nueva racha
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = y.toISOString().slice(0, 10);

  let current = 1;
  if (s) {
    const last = s.last_entry_date ? String(s.last_entry_date).slice(0, 10) : null;
    if (last === today) current = s.current_streak ?? 1;         // ya contada hoy
    else if (last === yesterday) current = (s.current_streak ?? 0) + 1;
    else current = 1;
  }
  const best = Math.max(s?.best_streak ?? 0, current);

  // Upsert por (profile_id,type). Requiere índice único en esas columnas.
  const { error: eUp } = await supabase
    .from("journal_streaks")
    .upsert(
      { profile_id, type, current_streak: current, best_streak: best, last_entry_date: today },
      { onConflict: "profile_id,type" }
    );
  if (eUp) throw eUp;

  return { current_streak: current, best_streak: best };
}

// Crea o reusa borrador de HOY. Si ya completaste hoy → error "already_completed".
// Retorna siempre el id de la entrada.
export async function startJournalEntry(type: JournalType) {
  const profile_id = await getMyProfileIdSafe(); // o tu función original
  const version_id = await getCurrentVersionId(type);
  const today = new Date().toISOString().slice(0,10);
  // reutiliza borrador de hoy
  const { data: existing, error: e1 } = await supabase
    .from("journal_entries")
    .select("id,status")
    .eq("profile_id", profile_id)
    .eq("type", type)
    .eq("entry_date", today)
    .maybeSingle();
  if (e1 && e1.code !== "PGRST116") throw e1;
  if (existing) {
    if (existing.status === "completed") throw Object.assign(new Error("already_completed"), { code: "already_completed" });
    return existing.id;
  }
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({ profile_id, type, version_id, status: "draft", entry_date: today })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

// Devuelve el estado de la entrada de HOY del usuario para ese tipo
export async function getTodayEntryStatus(type: JournalType): Promise<{ status: "none" | "draft" | "completed"; entryId?: string; }> {
  const profile_id = await getMyProfileIdSafe();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, status")
    .eq("profile_id", profile_id)
    .eq("type", type)
    .eq("entry_date", new Date().toISOString().slice(0, 10))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  if (!data) return { status: "none" };
  if (data.status === "completed") return { status: "completed", entryId: data.id };
  return { status: "draft", entryId: data.id };
}

async function getCurrentVersionId(type: "emotions" | "self-care"): Promise<number> {
  const { data, error } = await supabase
    .from("journal_forms")
    .select("current_version_id")
    .eq("type", type)
    .maybeSingle(); // <- en vez de .single()
  if (error) throw error;
  if (!data) throw Object.assign(new Error("no_form"), { code: "no_form" });
  if (!data.current_version_id) throw Object.assign(new Error("no_version"), { code: "no_version" });
  return data.current_version_id as number;
}


export async function getActiveItems(type: JournalType) {
  const { data, error } = await supabase
    .from("v_journal_active_items")
    .select("*")
    .eq("type", type)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map(normalizeItem);
}

export async function upsertAnswer(entryId: string, itemId: number, value: any) {
    const { error } = await supabase.rpc("journal_upsert_answer", {
        p_entry: entryId,
        p_item_id: itemId,
        p_value: value,
    });
    if (error) throw error;
}

export async function completeEntry(entryId: string) {
    const { error } = await supabase.rpc("journal_complete_entry", { p_entry: entryId });
    if (error) throw error;
}

export async function getMyStreakAll(type?: string) {
    const q = supabase
        .from("journal_streaks")
        .select("type,current_streak,best_streak,last_entry_date");
    const { data, error } = type ? await q.eq("type", type) : await q;
    if (error) throw error;
    return data ?? [];
}



// Devuelve racha del usuario para un tipo; ignora si falta el tipo
export async function getStreak(type?: JournalType) {
  if (!type) return { current_streak: 0, best_streak: 0, last_entry_date: null };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error("auth_missing");

  const { data: prof, error: eP } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();
  if (eP) throw eP;

  const { data, error } = await supabase
    .from("journal_streaks")
    .select("current_streak, best_streak, last_entry_date")
    .eq("profile_id", prof.id)
    .eq("type", type)
    .maybeSingle();
  if (error) throw error;
  return data ?? { current_streak: 0, best_streak: 0, last_entry_date: null };
}

/* Admin */
export async function adminCloneVersion(type: JournalType) {
    const { data, error } = await supabase.rpc("admin_clone_form_version", { p_type: type });
    if (error) throw error;
    return data as number;
}

export async function adminPublish(type: JournalType, versionId: number) {
    const { error } = await supabase.rpc("admin_publish_journal", {
        p_type: type,
        p_version_id: versionId,
    });
    if (error) throw error;
}

export async function adminGetForms() {
    const { data, error } = await supabase.from("journal_forms").select("id,type,name,current_version_id");
    if (error) throw error;
    return data ?? [];
}

export async function adminGetVersions(formId: number) {
    const { data, error } = await supabase
        .from("journal_form_versions")
        .select("id,version_no,status,created_at,published_at")
        .eq("form_id", formId)
        .order("version_no", { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export const normalizeItem = (raw: any) => {
  const toArr = (v: any): string[] => {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") { try { const x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch { return []; } }
    return [];
  };
  return {
    ...raw,
    scale_min: raw?.scale_min ?? 1,
    scale_max: raw?.scale_max ?? 5,
    scale_labels: toArr(raw?.scale_labels),
  };
};

// Admin: obtener items de una versión
export async function adminGetItems(versionId: number) {
  const { data, error } = await supabase
    .from("journal_items")
    .select("*")
    .eq("version_id", versionId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizeItem);
}

// Admin: upsert de item (devuelve item normalizado)
export async function adminUpsertItem(payload: any) {
  const { data, error } = await supabase
    .from("journal_items")
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return normalizeItem(data);
}

export async function adminDeleteItem(id: number) {
    const { error } = await supabase.from("journal_items").delete().eq("id", id);
    if (error) throw error;
}

export async function getMyEntries(type: JournalType, status: "draft" | "completed") {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return [];

    // Ajusta a tu vista si la tienes; aquí usamos la tabla base
    const { data, error } = await supabase
        .from("journal_entries")
        .select("id, created_at, updated_at, status, type, title")
        .eq("user_id", userId)
        .eq("type", type)
        .eq("status", status)
        .order("updated_at", { ascending: false });

    if (error) return [];

    return (data ?? []).map((r: any) => ({
        id: r.id as string,
        date: (r.updated_at ?? r.created_at) as string,
        status: r.status as "draft" | "completed",
        description: r.title ?? (r.type === "emotions" ? "Diario emocional" : "Diario de autocuido"),
    }));
}

export async function deleteJournalEntry(entryId: string) {
    // 1) RPC segura (recomendada)
    const { error: rpcErr } = await supabase.rpc("journal_delete_entry", { p_entry: entryId });
    if (rpcErr) {
        // 2) Fallback delete directo (RLS debe permitir solo drafts del usuario)
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) throw rpcErr;

        const { error } = await supabase
            .from("journal_entries")
            .delete()
            .eq("id", entryId)
            .eq("user_id", userId)
            .eq("status", "draft");
        if (error) throw error;
    }

    // Limpia autosave local
    try {
        localStorage.removeItem(`journal:entry:${entryId}`);
        localStorage.removeItem(`journal:answers:${entryId}`);
    } catch { }
}

export async function adminRenameVersion(versionId: number, name: string) {
    // RPC recomendada (respeta RLS)
    const { error: rpcErr } = await supabase.rpc("admin_rename_form_version", {
        p_version_id: versionId,
        p_name: name,
    });
    if (!rpcErr) return;

    // Fallback directo
    const { error } = await supabase
        .from("journal_form_versions")
        .update({ name })
        .eq("id", versionId);
    if (error) throw error;
}

export async function adminDeleteVersion(versionId: number) {
  // Solo drafts
  const { error: rpcErr } = await supabase.rpc("admin_delete_form_version", { p_version_id: versionId });
  if (!rpcErr) return;

  const { error } = await supabase
    .from("journal_form_versions")
    .delete()
    .eq("id", versionId)
    .eq("status", "draft");
  if (error) throw error;
}

export async function adminForceDeleteVersion(versionId: number) {
    // Elimina cualquier estado (incluye published). Úsalo solo con doble confirmación.
    const { error } = await supabase.rpc("admin_force_delete_form_version", {
        p_version_id: versionId,
    });
    if (error) throw error;
}

export async function adminUpdateItemScale(itemId: number, payload: {
  scale_min: number;
  scale_max: number;
  scale_labels: string[];
}) {
  const { data, error } = await supabase
    .from("journal_items")
    .update({
      scale_min: payload.scale_min,
      scale_max: payload.scale_max,
      scale_labels: payload.scale_labels,
    })
    .eq("id", itemId)
    .select()
    .single();
  if (error) throw error;
  return normalizeItem(data);
}

// Admin: actualizar sólo escala (min/max/labels)
export async function updateJournalItemScale(itemId: number, params: {
  scale_min: number; scale_max: number; scale_labels: string[];
}) {
  const { data, error } = await supabase
    .from("journal_items")
    .update({
      scale_min: params.scale_min,
      scale_max: params.scale_max,
      scale_labels: params.scale_labels,
    })
    .eq("id", itemId)
    .select()
    .single();
  if (error) throw error;
  return normalizeItem(data);
}

// Guardar respuestas
export async function upsertScaleAnswer(entry_id: string, item_id: number, scale_value: number) {
  const { data, error } = await supabase
    .from("journal_answers")
    .upsert({ entry_id, item_id, scale_value })
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function upsertOptionsAnswer(entry_id: string, item_id: number, options_values: string[]) {
  const { data, error } = await supabase
    .from("journal_answers")
    .upsert({ entry_id, item_id, options_values })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Historial de entradas (del usuario)
export async function getJournalHistory(type: JournalType, limit = 30) {
  const profile_id = await getMyProfileIdSafe();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, entry_date, status, created_at, completed_at, version_id")
    .eq("profile_id", profile_id)
    .eq("type", type)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
// Respuestas de una entrada (con metadatos del ítem)
export async function getEntryAnswers(entry_id: string) {
  const { data, error } = await supabase
    .from("journal_answers")
    .select("item_id, scale_value, options_values")
    .eq("entry_id", entry_id);
  if (error) throw error;

  const ids = (data ?? []).map((x) => x.item_id);
  if (!ids.length) return [];

  const { data: items, error: e2 } = await supabase
    .from("journal_items")
    .select("id, kind, prompt, scale_min, scale_max, scale_labels, scale_left_label, scale_right_label, options, multi_select")
    .in("id", ids);
  if (e2) throw e2;

  const nrm = (raw: any) => {
    let labels: string[] = [];
    try {
      labels = Array.isArray(raw.scale_labels)
        ? raw.scale_labels
        : typeof raw.scale_labels === "string"
          ? JSON.parse(raw.scale_labels)
          : [];
    } catch { labels = []; }
    let options: any[] = [];
    try {
      options = Array.isArray(raw.options)
        ? raw.options
        : typeof raw.options === "string"
          ? JSON.parse(raw.options)
          : [];
    } catch { options = []; }
    return { ...raw, scale_labels: labels, options };
  };
  const map = new Map(items?.map((i: any) => [i.id, nrm(i)]) ?? []);
  return (data ?? []).map((a) => ({ ...a, item: map.get(a.item_id) }));
}

export async function adminListJournalEntries(params: {
  type?: JournalType | "all";
  status?: "draft" | "completed" | "all";
  from?: string; to?: string; search?: string; limit?: number; offset?: number;
}) {
  const { type="all", status="all", from, to, search, limit=100, offset=0 } = params;
  const { data: rpc, error } = await supabase.rpc("admin_list_journal_entries_v2", {
    p_type: type, p_status: status, p_from: from || null, p_to: to || null,
    p_search: search?.trim() || null, p_limit: limit, p_offset: offset,
  });
  if (error) { console.error("adminListJournalEntries RPC error:", error); return { rows: [] }; }
  const rows = (rpc || []).map((e: any) => ({
    id: e.id, profile_id: e.profile_id, type: e.type, status: e.status,
    entry_date: e.entry_date, completed_at: e.completed_at, created_at: e.created_at, version_id: e.version_id,
    profile: {
      id: e.profile_id,
      name: e.profile_name || "—",
      identifier: e.profile_identifier || "—",
    },
  }));
  return { rows };
}

// Admin: obtener respuestas + metadatos (incluye perfil)
export async function adminGetEntryWithAnswers(entryId: string) {
  // 1) RPC (admin)
  const { data: rpc, error: rpcErr } = await supabase.rpc("admin_get_entry_with_answers", {
    p_entry_id: entryId,
  });
  if (rpcErr) {
    console.error("adminGetEntryWithAnswers RPC error:", rpcErr);
    throw rpcErr;
  }
  // rpc.profile.identifier ya no trae email
  return rpc;
}


