import { supabase } from "@/core/api/supabaseClient";

export type JournalType = "emotions" | "self-care";

export async function startJournalEntry(type: JournalType) {
    const { data, error } = await supabase.rpc("journal_start_entry", { p_type: type });
    if (error) throw error;
    return data as string;
}

export async function getActiveItems(type: JournalType) {
    const { data, error } = await supabase
        .from("v_journal_active_items")
        .select("*")
        .eq("type", type)
        .order("sort_order");
    if (error) throw error;
    return data ?? [];
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
    const { data, error } = await supabase
        .from("journal_streaks")
        .select("type,current_streak,best_streak,last_entry_date")
        .eq("type", type);
    if (error) throw error;
    return data ?? [];
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

export async function adminGetItems(versionId: number) {
    const { data, error } = await supabase
        .from("journal_items")
        .select("*")
        .eq("version_id", versionId)
        .order("sort_order");
    if (error) throw error;
    return data ?? [];
}

export async function adminUpsertItem(item: any) {
    const { data, error } = await supabase.from("journal_items").upsert(item).select().single();
    if (error) throw error;
    return data;
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