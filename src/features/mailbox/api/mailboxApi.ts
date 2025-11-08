import { supabase } from '@/core/api/supabaseClient';

export type MailboxAttachment = {
  name: string;
  path: string; // storage path inside bucket "mailbox"
  type?: string | null;
  size?: number | null;
};

export type CreateSuggestionInput = {
  id?: string; // if not provided, a UUID will be generated client-side
  author_profile_id: string;
  role_id: 2 | 3 | 1; // admin optional; RLS may restrict
  subject: string;
  message: string;
  category?: string | null;
  files?: File[]; // optional attachments to upload
};

export async function getMyProfileId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  return data?.id ?? null;
}

function sanitizeFilename(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function createSuggestion(input: CreateSuggestionInput) {
  const suggestionId = input.id ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  // 1) Insert row first (with empty attachments), client-provided id for stable storage path
  const { error: insertError } = await supabase
    .from('mailbox')
    .insert({
      id: suggestionId,
      author_profile_id: input.author_profile_id,
      role_id: input.role_id,
      subject: input.subject,
      message: input.message,
      category: input.category ?? null,
      attachments: null,
    });
  if (insertError) throw insertError;

  const files = input.files ?? [];
  let uploaded: MailboxAttachment[] = [];

  if (files.length > 0) {
    const bucket = supabase.storage.from('mailbox');
    for (const file of files) {
      const uniqueName = `${Date.now()}_${sanitizeFilename(file.name)}`;
      const path = `${suggestionId}/${uniqueName}`;
      const { error: upErr } = await bucket.upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      uploaded.push({ name: file.name, path, type: file.type || null, size: file.size ?? null });
    }

    // 2) Update attachments metadata
    const { error: updErr } = await supabase
      .from('mailbox')
      .update({ attachments: uploaded })
      .eq('id', suggestionId);
    if (updErr) throw updErr;
  }

  return { id: suggestionId, attachments: uploaded };
}

export async function listMySuggestions() {
  const profileId = await getMyProfileId();
  if (!profileId) return [];
  const { data, error } = await supabase
    .from('mailbox')
    .select('*')
    .eq('author_profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function adminListSuggestions() {
  // 1) Obtener sugerencias
  const { data: rows, error } = await supabase
    .from('mailbox')
    .select('id, subject, message, category, role_id, created_at, attachments, author_profile_id')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const list = rows ?? [];
  if (list.length === 0) return [];

  // 2) Cargar perfiles de los autores en lote para construir el nombre
  const ids = Array.from(new Set(list.map((r: any) => r.author_profile_id).filter(Boolean)));
  let nameById = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, first_names, last_names, email')
      .in('id', ids);
    (profs ?? []).forEach((p: any) => {
      const fn = (p.first_names || '').trim();
      const ln = (p.last_names || '').trim();
      const full = [fn, ln].filter(Boolean).join(' ') || p.email || 'Sin nombre';
      nameById.set(p.id, full);
    });
  }

  return list.map((r: any) => ({
    ...r,
    sender_full_name: nameById.get(r.author_profile_id) ?? 'Sin nombre',
  }));
}
