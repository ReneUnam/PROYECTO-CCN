import { supabase } from '@/core/api/supabaseClient';

export type MaterialRecord = {
  id: string;
  title: string;
  description?: string | null;
  file_path: string; // path in storage bucket
  thumbnail_path?: string | null; // path in storage bucket
  created_at?: string;
};

const BUCKET = 'materials';

export async function listMaterials(): Promise<(MaterialRecord & { file_url: string; thumbnail_url?: string })[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  const items = (data ?? []).map((row) => {
    const fileUrl = supabase.storage.from(BUCKET).getPublicUrl(row.file_path).data.publicUrl;
    const thumbUrl = row.thumbnail_path
      ? supabase.storage.from(BUCKET).getPublicUrl(row.thumbnail_path).data.publicUrl
      : undefined;
    return { ...row, file_url: fileUrl, thumbnail_url: thumbUrl };
  });
  return items as any;
}

function uniqueName(prefix: string, file: File) {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const ts = Date.now();
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${ts}-${rnd}.${ext}`;
}

export async function uploadMaterial(params: {
  title: string;
  description?: string;
  pdfFile: File;
  thumbnailFile?: File | null;
}): Promise<MaterialRecord> {
  const { title, description, pdfFile, thumbnailFile } = params;

  // 1) Upload files to storage bucket
  const pdfPath = uniqueName('pdf', pdfFile);
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(pdfPath, pdfFile, {
    cacheControl: '3600',
    upsert: false,
  });
  if (upErr) throw upErr;

  let thumbPath: string | undefined;
  if (thumbnailFile) {
    thumbPath = uniqueName('thumbs', thumbnailFile);
    const { error: thErr } = await supabase.storage.from(BUCKET).upload(thumbPath, thumbnailFile, {
      cacheControl: '3600',
      upsert: false,
    });
    if (thErr) throw thErr;
  }

  // 2) Insert DB row
  const { data, error } = await supabase
    .from('materials')
    .insert({
      title,
      description: description ?? null,
      file_path: pdfPath,
      thumbnail_path: thumbPath ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as any;
}

export async function updateMaterial(params: {
  id: string;
  title?: string;
  description?: string | null;
  pdfFile?: File | null; // optional new PDF; if provided, uploads and updates file_path
  thumbnailFile?: File | null; // optional new thumbnail; if provided, uploads and updates thumbnail_path
}): Promise<MaterialRecord> {
  const { id, title, description, pdfFile, thumbnailFile } = params;

  // Prepare patch object
  const patch: Partial<MaterialRecord> = {};
  if (typeof title !== 'undefined') patch.title = title;
  if (typeof description !== 'undefined') patch.description = description;

  // Optionally upload new files and set new paths
  if (pdfFile) {
    const newPdfPath = uniqueName('pdf', pdfFile);
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(newPdfPath, pdfFile, {
      cacheControl: '3600',
      upsert: false,
    });
    if (upErr) throw upErr;
    patch.file_path = newPdfPath;
  }

  if (thumbnailFile) {
    const newThumbPath = uniqueName('thumbs', thumbnailFile);
    const { error: thErr } = await supabase.storage.from(BUCKET).upload(newThumbPath, thumbnailFile, {
      cacheControl: '3600',
      upsert: false,
    });
    if (thErr) throw thErr;
    patch.thumbnail_path = newThumbPath;
  }

  const { data, error } = await supabase
    .from('materials')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as any;
}

export async function deleteMaterial(params: {
  id: string;
  filePath?: string | null;
  thumbnailPath?: string | null;
}): Promise<void> {
  const { id, filePath, thumbnailPath } = params;

  // Best-effort: remove files first (if paths provided). Ignore errors to avoid blocking DB delete in case files were already removed.
  const paths: string[] = [];
  if (filePath) paths.push(filePath);
  if (thumbnailPath) paths.push(thumbnailPath);
  if (paths.length > 0) {
    const { error: remErr } = await supabase.storage.from(BUCKET).remove(paths);
    if (remErr) {
      // Log to console; continue with DB delete
      console.warn('No se pudieron eliminar algunos objetos de storage:', remErr.message || remErr);
    }
  }

  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
