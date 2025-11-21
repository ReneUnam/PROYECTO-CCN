import { supabase } from '@/core/api/supabaseClient';

export type MailboxAttachment = {
  name: string;
  path: string; // storage path inside bucket "mailbox"
  type?: string | null;
  size?: number | null;
};

export type CreateSuggestionInput = {
  id?: string; // if not provided, a UUID will be generated client-side
  author_profile_id?: string; // si no se provee, se buscará vía auth.uid() -> profiles.id
  role_id: 2 | 3 | 1; // admin opcional; RLS puede restringir
  subject: string;
  message: string;
  category?: string | null;
};

// Preferir RPC para evitar RLS sobre profiles y usar la función SECURITY DEFINER
export async function getCurrentProfileIdRPC(): Promise<string | null> {
  const { data, error } = await supabase.rpc('current_profile_id');
  if (error) {
    console.warn('RPC current_profile_id falló:', error.message);
    return null;
  }
  return (data as any) ?? null;
}

// No file uploads in the simplified mailbox flow

export async function createSuggestion(input: CreateSuggestionInput) {
  // Resolver profile id si no se proporciona. Intentamos vía RPC.
  // Si no obtenemos valor, omitimos la columna para permitir DEFAULT en BD.
  let authorProfileId = input.author_profile_id ?? null;
  if (!authorProfileId) {
    authorProfileId = await getCurrentProfileIdRPC();
  }
  const suggestionId = input.id ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  // Se eliminó la carga de archivos; no subimos adjuntos

  // 2) Insert row with full attachments list (or null)
  const payload: any = {
    id: suggestionId,
    role_id: input.role_id,
    subject: input.subject,
    message: input.message,
    category: input.category ?? null,
    attachments: null,
  };
  if (authorProfileId) payload.author_profile_id = authorProfileId;

  const { error: insertError } = await supabase
    .from('mailbox')
    .insert(payload);
  if (insertError) {
    console.error('Fallo al insertar en mailbox:', insertError);
    throw insertError;
  }

  return { id: suggestionId, attachments: [] };
}

export async function listMySuggestions() {
  // Confiar en RLS para devolver solo filas del autor actual
  const { data, error } = await supabase
    .from('mailbox')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function adminListSuggestions() {
  // 1) Obtener sugerencias
  const { data: rows, error } = await supabase
    .from('mailbox')
    .select('id, subject, message, category, role_id, created_at, author_profile_id')
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

// Delete a suggestion (admin). Removes storage attachments first.
export async function deleteSuggestion(id: string) {
  // Fetch attachments for the row (RLS allows admin)
  const { data, error } = await supabase
    .from('mailbox')
    .select('attachments')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;

  const attachments: MailboxAttachment[] = (data?.attachments as any[]) || [];
  if (attachments.length) {
    const bucket = supabase.storage.from('mailbox');
    const paths = attachments.map(a => a.path).filter(Boolean);
    if (paths.length) {
      const { error: remErr } = await bucket.remove(paths);
      if (remErr) console.warn('No se pudieron eliminar algunos archivos del storage:', remErr.message);
    }
  }

  const { error: delErr } = await supabase.from('mailbox').delete().eq('id', id);
  if (delErr) throw delErr;
  return { id };
}

// Crear URL firmada para un adjunto (solo admin debe poder leer otros paths vía RLS + storage policies)
// getMailboxAttachmentUrl eliminado al quitar adjuntos del buzón
