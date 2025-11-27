import { useState, useEffect, useRef, type JSX, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/core/api/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/core/components/Cards';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/components/toast/ToastProvider';
import {
  ChevronLeft,
  Trash,
  ArrowUp,
  User,
  Users,
  Mail,
  Hash,
  GraduationCap,
  Key,
  Plus,
  UploadCloud,
  FileText,
  Info,
  UserPlus,
  IdCard
} from 'lucide-react';
import * as XLSX from 'xlsx';

export function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role_id !== 1) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function RegisterPage() {
  const toast = useToast();
  interface StudentItem {
    institutionId: string;
    firstNames: string;
    lastNames: string;
    email: string;
    grade?: string | null;
    tempPassword: string;
  }
  const [institutionId, setInstitutionId] = useState('');
  const [firstNames, setFirstNames] = useState('');
  const [lastNames, setLastNames] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(3); // 2=teacher, 3=student
  const [grade, setGrade] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  // validation/messages are shown via toast provider
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseTotal, setParseTotal] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [batch, setBatch] = useState<StudentItem[]>([]);
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showExcelHelp, setShowExcelHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const parseAbortRef = useRef(false);
  const uploadAbortRef = useRef(false);

  function validateEmail(addr: string) {
    return typeof addr === 'string' && addr.includes('@');
  }

  async function handleCreateUser() {
    try {
      setIsCreating(true);

      // 1) Verifica sesión real
      const { data: s } = await supabase.auth.getUser();
      if (!s.user) {
        toast.warning('Inicia sesión como administrador.');
        return;
      }

      // 2) Confirma que eres admin en DB
      const { data: who, error: whoErr } = await supabase.rpc('debug_whoami');
      if (whoErr) throw whoErr;
      const isAdmin = who?.[0]?.is_admin === true;
      if (!isAdmin) {
        toast.warning('Solo un admin puede crear perfiles.');
        return;
      }

      // Validaciones
      if (!institutionId || !firstNames || !lastNames || !email || !tempPassword) {
        toast.warning('Todos los campos son obligatorios');
        return;
      }
      if (!validateEmail(email)) {
        toast.warning('Correo inválido: debe contener "@".');
        return;
      }
      if (Number(roleId) === 3 && !grade) {
        toast.warning('Selecciona el grado para estudiantes');
        return;
      }
      if (![2, 3].includes(Number(roleId))) {
        toast.warning('El rol Admin no se crea desde aquí.');
        return;
      }

      // 3) Llama la RPC segura (NO insert directo)
      const { error } = await supabase.rpc('admin_create_profile', {
        p_institution_id: institutionId.trim(),
        p_first_names: firstNames.trim(),
        p_last_names: lastNames.trim(),
        p_email: email.trim(),
        p_role_id: Number(roleId), // 2 o 3
        p_grade: grade ? grade.trim() : null,
        p_temp_password: tempPassword.trim(),
      });

      if (error) throw error;

      const createdName = `${firstNames} ${lastNames}`.trim();
      // show toast for success (do NOT set inline error message)
      toast.success(`Usuario creado: ${createdName}`);
      // clear inputs after short delay (do NOT navigate)
      setTimeout(() => {
        setInstitutionId('');
        setFirstNames('');
        setLastNames('');
        setEmail('');
        setTempPassword('');
        setRoleId(3);
        setGrade('');
        setIsDirty(false);
      }, 700);
    } catch (err: any) {
      // Muestra detalle útil cuando venga 403/401
      const detail = err?.message || err?.error_description || 'No autorizado o función no disponible.';
      toast.error(detail);
      console.error('create_profile RPC error:', err);
    } finally {
      setIsCreating(false);
    }
  }

  // Merge parsed items into the batch, avoiding duplicates by institutionId.
  function addUniqueToBatch(newItems: StudentItem[], failedList?: { row?: number; reason: string }[]) {
    setBatch((prev) => {
      const exist = new Set(prev.map((x) => String(x.institutionId || '').trim().toLowerCase()));
      const additions: StudentItem[] = [];
      for (const item of newItems) {
        const id = String(item.institutionId || '').trim().toLowerCase();
        if (!id) {
          if (failedList) failedList.push({ row: 0, reason: 'ID vacío' });
          continue;
        }
        if (exist.has(id)) {
          if (failedList) failedList.push({ row: 0, reason: 'ID duplicado' });
          continue;
        }
        exist.add(id);
        additions.push(item);
      }
      if (additions.length > 0) setIsDirty(true);
      return [...prev, ...additions];
    });
  }

  async function ensureAdmin(): Promise<boolean> {
    const { data: s } = await supabase.auth.getUser();
    if (!s.user) {
      toast.warning('Inicia sesión como administrador.');
      return false;
    }
    const { data: who, error: whoErr } = await supabase.rpc('debug_whoami');
    if (whoErr) {
      toast.error('No se pudo verificar el usuario.');
      console.error(whoErr);
      return false;
    }
    const isAdmin = who?.[0]?.is_admin === true;
    if (!isAdmin) {
      toast.warning('Solo un admin puede crear perfiles.');
      return false;
    }
    return true;
  }

  function handleAddToBatch() {
    // previous messages use toasts
    // Only students allowed in the batch flow
    if (Number(roleId) !== 3) {
      toast.warning('La lista es solo para estudiantes. Cambia el rol a Student para agregar.');
      return;
    }
    if (!institutionId || !firstNames || !lastNames || !email || !tempPassword || !grade) {
      toast.warning('Todos los campos del estudiante son obligatorios para agregar a la lista.');
      return;
    }

    if (!validateEmail(email)) {
      toast.warning('Correo inválido: debe contener "@".');
      return;
    }

    const item: StudentItem = {
      institutionId: institutionId.trim(),
      firstNames: firstNames.trim(),
      lastNames: lastNames.trim(),
      email: email.trim(),
      grade: grade.trim(),
      tempPassword: tempPassword.trim(),
    };

    // Avoid duplicates
    const exists = batch.some((x) => String(x.institutionId || '').trim().toLowerCase() === String(item.institutionId || '').trim().toLowerCase());
    if (exists) {
      toast.warning('Ya existe un estudiante con ese ID en la lista.');
      return;
    }
    setBatch((b) => [...b, item]);

    // clear student-specific fields but keep institution (optional)
    setInstitutionId('');
    setFirstNames('');
    setLastNames('');
    setEmail('');
    setTempPassword('');
    setGrade('');
    setIsDirty(true);
  }

  function handleRemoveFromBatch(index: number) {
    setBatch((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const formHasValues = Boolean(firstNames || lastNames || email || tempPassword || institutionId || grade);
      setIsDirty(next.length > 0 || formHasValues);
      return next;
    });
  }

  async function handleUploadBatch() {
    if (!batch.length) {
      toast.warning('La lista está vacía. Agrega estudiantes antes de subir.');
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    setUploadTotal(batch.length);
    try {
      if (import.meta.env?.DEV) setDebugLines([]);
      const ok = await ensureAdmin();
      if (!ok) return;

      const concurrency = 6; // parallel RPC calls
      let success = 0;
      const failed: { idx: number; error: any }[] = [];
      uploadAbortRef.current = false;

      for (let i = 0; i < batch.length; i += concurrency) {
        if (uploadAbortRef.current) break;
        const chunk = batch.slice(i, i + concurrency);
        const promises = chunk.map(async (s, j) => {
          const globalIdx = i + j;
          try {
            const res = await supabase.rpc('admin_create_profile', {
              p_institution_id: s.institutionId,
              p_first_names: s.firstNames,
              p_last_names: s.lastNames,
              p_email: s.email,
              p_role_id: 3,
              p_grade: s.grade ?? null,
              p_temp_password: s.tempPassword,
            });
            const err = (res as any).error;
            if (err) {
              failed.push({ idx: globalIdx, error: err });
            } else {
              success += 1;
            }
          } catch (err) {
            failed.push({ idx: globalIdx, error: err });
          } finally {
            // increment progress per finished row so UI updates smoothly
            setUploadProgress((p) => Math.min(batch.length, p + 1));
            if (import.meta.env?.DEV) setDebugLines((prev) => [...prev.slice(-9), `[upload] finished idx:${globalIdx}`]);
          }
        });

        await Promise.all(promises);
      }

      if (failed.length === 0) {
        toast.success(`Subidos ${success} estudiantes`);
        setBatch([]);
        setIsDirty(false);
      } else {
        toast.warning(`Se subieron ${success} estudiantes. ${failed.length} fallaron.`);
        const failedSet = new Set(failed.map((f) => f.idx));
        setBatch((prev) => prev.filter((_, i) => failedSet.has(i)));
        setIsDirty(true);
      }
    } catch (err: any) {
      const detail = err?.message || 'Error al subir la lista.';
      toast.error(detail);
      console.error('upload batch error:', err);
    } finally {
      setIsUploading(false);
      uploadAbortRef.current = false;
      // leave progress visible briefly
      setTimeout(() => {
        setUploadProgress(0);
        setUploadTotal(0);
      }, 800);
    }
  }

  // Worker-backed Excel parser (preferred for large files). Falls back to a chunked main-thread parser.
  async function handleExcelFileWorker(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // mark parsing started and set a safe default total of 1 so UI shows progress placeholder
    setIsParsing(true);
    setParseTotal(1);
    setParseProgress(0);

    // Try to use a Worker; if it fails (bundler/permission), fall back to chunked parsing on main thread
    // pre-compute a best-effort total BEFORE starting the worker/fallback so UI shows a total
    let buffer: ArrayBuffer | undefined;
    try {
      buffer = await file.arrayBuffer();
      try {
        const wbk = XLSX.read(buffer, { type: 'array' });
        const sh = wbk.Sheets[wbk.SheetNames[0]];
        const ref = (sh as any)?.['!ref'];
        if (ref) {
          const r = XLSX.utils.decode_range(ref);
          const calcTotal = Math.max(0, r.e.r - r.s.r);
          setParseTotal(calcTotal);
          setParseProgress(0);
        } else {
          // fallback quick estimate
          const rowsSmall: any[] = XLSX.utils.sheet_to_json(sh, { defval: '' });
          setParseTotal(rowsSmall.length);
          setParseProgress(0);
        }
      } catch (e) {
        // ignore
      }
    } catch (err) {
      // couldn't read buffer yet; continue, worker or fallback will set totals
    }

    if ((window as any).Worker) {
      try {
        setIsParsing(true);
        if (import.meta.env?.DEV) setDebugLines([]);
        const worker = new Worker(new URL('./parser.worker.ts', import.meta.url), { type: 'module' });
        // register worker ref so we can cancel if needed
        workerRef.current = worker;
        parseAbortRef.current = false;
        // reuse buffer already read earlier, but if not, read it now
        const localBuf = buffer ?? (await file.arrayBuffer());
        worker.postMessage({ type: 'parse', buffer: localBuf } as any);

        const onMessage = (ev: MessageEvent) => {
          const data = ev.data;
          if (!data) return;
          // debugging: ensure progress messages are logged during dev
          // eslint-disable-next-line no-console
          console.debug('[ImportWorker] msg:', data);
          if (import.meta.env?.DEV) {
            setDebugLines((prev) => [...prev.slice(-9), JSON.stringify(data)]);
          }
          if (data.type === 'progress') {
            try {
              // worker sends processed count in `parsed` and total
              setParseProgress(Number(data.parsed) || 0);
              setParseTotal(Number(data.total) || 0);
            } catch (err) {
              // ignore
            }
            return;
          }
            if (data.type === 'done') {
              // eslint-disable-next-line no-console
              console.debug('[ImportWorker] done:', { parsed: data.parsed?.length, failed: data.failed?.length });
              if (import.meta.env?.DEV) setDebugLines((prev) => [...prev.slice(-9), `[done] parsed:${data.parsed?.length} failed:${data.failed?.length}`]);
            const parsed: StudentItem[] = data.parsed ?? [];
            const failed: any[] = data.failed ?? [];
            if (parsed.length) {
              // Deduplicate against existing batch and within parsed
              const beforeCount = batch.length;
              const dedupFailed: { row?: number; reason: string }[] = [];
              addUniqueToBatch(parsed, dedupFailed);
              const added = Math.max(0, parsed.length - dedupFailed.length);
              if (added > 0) {
                toast.success(`Se importaron ${added} estudiantes a la lista.`);
              }
              if (dedupFailed.length > 0) {
                toast.warning(`${dedupFailed.length} filas omitidas por ID duplicado u otros errores.`);
                console.warn('Filas omitas por duplicado:', dedupFailed.slice(0, 20));
              }
            }
            if (failed.length) {
              toast.warning(`${failed.length} filas omitidas por errores. Revisa el formato del archivo.`);
              console.warn('Filas fallidas al importar Excel:', failed.slice(0, 20));
            }
            setIsParsing(false);
            setParseProgress((p) => (parseTotal > 0 ? parseTotal : p));
            setTimeout(() => {
              setParseProgress(0);
              setParseTotal(0);
            }, 1500);
            // cleanup
            try {
              worker.removeEventListener('message', onMessage);
            } catch (e) {
              // ignore
            }
            try {
              worker.terminate();
            } catch (e) {
              // ignore
            }
            if (workerRef.current === worker) workerRef.current = null;
          }
        };

        worker.addEventListener('message', onMessage);
        if (e.currentTarget) e.currentTarget.value = '';
        return;
      } catch (err) {
        console.warn('No se pudo calcular total de filas por pre-parseo:', err);
        toast.info('Importando archivo: no se pudo estimar total de filas, puede tomar un momento.');
      }
    }

    // Fallback: chunked parsing on main thread to avoid freezing UI and to show progress. Use pre-read buffer when available.
    if (buffer) return parseExcelBuffer(buffer);
    return parseExcelFallback(file);
  }

  // Parse the excel in chunks on the main thread, yielding between chunks so the UI stays responsive.
  async function parseExcelBuffer(buffer: ArrayBuffer) {
    try {
      setIsParsing(true);
      if (import.meta.env?.DEV) setDebugLines([]);
      setParseProgress(0);
      parseAbortRef.current = false;
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      // Avoid creating a giant `rows` array with sheet_to_json for large files which blocks the main thread.
      const sheetRef = (sheet as any)?.['!ref'];
      let startRow = 0;
      let endRow = -1;
      let startCol = 0;
      let endCol = -1;
      if (sheetRef) {
        const range = XLSX.utils.decode_range(sheetRef);
        startRow = range.s.r;
        endRow = range.e.r;
        startCol = range.s.c;
        endCol = range.e.c;
      }
      // Build header row explicitly reading each header cell
      const headerRow: string[] = [];
      for (let c = startCol; c <= endCol; c++) {
        const addr = XLSX.utils.encode_cell({ r: startRow, c });
        const val = (sheet && (sheet as any)[addr] && (sheet as any)[addr].v) ? String((sheet as any)[addr].v) : '';
        headerRow.push(val);
      }
      // convert headerRow into a normalized map like before
      const normMap = new Map<string, string>();
      const normalizeHeader = (s: string) =>
        String(s || '')
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .replace(/[^a-z0-9]/gi, '')
          .toLowerCase();
      headerRow.forEach((h) => {
        const key = String(h || '');
        if (key) normMap.set(normalizeHeader(key), key);
      });

      const total = Math.max(0, endRow - startRow);
      setParseTotal(Math.max(1, total));
      // eslint-disable-next-line no-console
      console.debug('[parseFallback] start', { total, startRow, endRow, startCol, endCol });
      if (import.meta.env?.DEV) setDebugLines((prev) => [...prev.slice(-9), `[parseFallback] start total:${total}`]);

      const parsed: StudentItem[] = [];
      const failed: { row: number; reason: string }[] = [];
      const existingIds = new Set(batch.map((b) => String(b.institutionId || '').trim().toLowerCase()));
      const seenIds = new Set<string>();

      // Note: normMap and normalizeHeader are already defined above for streaming parse

      const mapKeys = (row: any, keys: string[]) => {
        for (const candidate of keys) {
          const nc = normalizeHeader(candidate);
          if (normMap.has(nc)) {
            const original = normMap.get(nc)!;
            const v = row[original];
            if (v !== undefined && v !== null && String(v).trim() !== '') return v;
          }
        }
        for (const actualKey of Object.keys(row)) {
          const nk = normalizeHeader(actualKey);
          for (const candidate of keys) {
            if (nk === normalizeHeader(candidate)) {
              const v = row[actualKey];
              if (v !== undefined && v !== null && String(v).trim() !== '') return v;
            }
          }
        }
        return '';
      };

      const CHUNK = Math.max(5, Math.floor(total / 200)); // dynamic chunk; at least 5
      for (let rr = startRow + 1; rr <= endRow; rr++) {
        if (parseAbortRef.current) {
          toast.info('Importación cancelada.');
          break;
        }
        const i = rr - (startRow + 1); // zero-based index
        // build a row object keyed by header values (like sheet_to_json output)
        const rowObj: Record<string, any> = {};
        for (let c = startCol; c <= endCol; c++) {
          const addr = XLSX.utils.encode_cell({ r: rr, c });
          const header = headerRow[c - startCol] || '';
          const value = (sheet && (sheet as any)[addr] && (sheet as any)[addr].v !== undefined) ? (sheet as any)[addr].v : '';
          rowObj[header] = value;
        }
        const inst = String(
          mapKeys(rowObj, [
            'institutionId',
            'institution_id',
            'ID',
            'Id',
            'id',
            'ID Institucional',
            'ID_institucional',
            'id_institucional',
            'Identificador',
          ])
        ).trim();
        const fn = String(mapKeys(rowObj, ['firstNames', 'first_names', 'nombres', 'Nombres'])).trim();
        const ln = String(mapKeys(rowObj, ['lastNames', 'last_names', 'apellidos', 'Apellidos'])).trim();
        const em = String(mapKeys(rowObj, ['email', 'Email', 'correo', 'Correo', 'correo electrónico', 'correo_electronico', 'correo_electronico'])).trim();
        const gr = String(mapKeys(rowObj, ['grade', 'grado', 'Grade', 'Grado'])).trim();
        const tp = String(mapKeys(rowObj, ['tempPassword', 'temp_password', 'password', 'contraseña', 'Contraseña'])).trim();

        if (!inst || !fn || !ln || !em || !tp || !gr) {
          failed.push({ row: i + 2, reason: 'Faltan campos obligatorios' });
        } else if (!String(em).includes('@')) {
          failed.push({ row: i + 2, reason: 'Correo inválido' });
        } else if (existingIds.has(inst.toLowerCase()) || seenIds.has(inst.toLowerCase())) {
          failed.push({ row: i + 2, reason: 'ID duplicado' });
        } else {
          seenIds.add(inst.toLowerCase());
          parsed.push({ institutionId: inst, firstNames: fn, lastNames: ln, email: em, grade: gr, tempPassword: tp });
        }
        // update progress frequently - at least when small CHUNK or at multiples
        if (i % CHUNK === 0 || total < CHUNK * 2) {
          setParseProgress(i + 1);
          // eslint-disable-next-line no-console
          console.debug('[parseFallback] progress', i + 1, 'of', total);
          if (import.meta.env?.DEV) setDebugLines((prev) => [...prev.slice(-9), `[parseFallback] progress ${i + 1}/${total}`]);
          // yield so the UI can update
          // eslint-disable-next-line no-await-in-loop
          await new Promise((res) => setTimeout(res, 0));
        }
      }

      // final update
      if (!parseAbortRef.current) setParseProgress(Math.max(1, total));
      if (parsed.length) {
        const dedupFailures: { row?: number; reason: string }[] = [];
        // merge parsed into batch, recording any additional failures
        addUniqueToBatch(parsed, dedupFailures);
        // build summary messages
        const added = parsed.length - dedupFailures.length;
        if (added > 0) toast.success(`Se importaron ${added} estudiantes a la lista.`);
        if (dedupFailures.length > 0) {
          toast.warning(`${dedupFailures.length} filas omitidas por ID duplicado u otros errores.`);
          console.warn('Filas omitidas por duplicado:', dedupFailures.slice(0, 20));
        }
      }
      if (failed.length) {
        toast.warning(`${failed.length} filas omitidas por errores. Revisa el formato del archivo.`);
        console.warn('Filas fallidas al importar Excel:', failed.slice(0, 20));
      }
      // eslint-disable-next-line no-console
      console.debug('[parseFallback] done', { parsed: parsed.length, failed: failed.length });
      if (import.meta.env?.DEV) setDebugLines((prev) => [...prev.slice(-9), `[parseFallback] done p:${parsed.length} f:${failed.length}`]);
    } catch (err) {
      console.error('Error parsing excel fallback', err);
      toast.error('Error leyendo el archivo. Asegúrate que es un Excel válido.');
    } finally {
      setIsParsing(false);
      setTimeout(() => {
        setParseProgress(0);
        setParseTotal(0);
      }, 1500);
      // reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function parseExcelFallback(file: File) {
    const buffer = await file.arrayBuffer();
    return parseExcelBuffer(buffer);
  }

  async function handleExcelFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsParsing(true);
      const arrayBuf = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuf, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // get header row explicitly and build normalized header map
      const headerRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const headerRow: string[] = Array.isArray(headerRows) && headerRows.length ? (headerRows[0] as string[]) : [];

      const normalizeHeader = (s: string) =>
        String(s || '')
          .normalize('NFD')
          .replace(/[ -]/g, (ch) => ch)
          .replace(/[ -]/g, (ch) => ch)
          .replace(/[ -]/g, (ch) => ch)
          .replace(/[ -]/g, (ch) => ch)
          .replace(/[ -]/g, (ch) => ch)
          .replace(/[ -]/g, (ch) => ch)
          .replace(/[ -]/g, (ch) => ch)
          .replace(/[ -]/g, (ch) => ch)
          .replace(/[ - ]/g, '')
          .replace(/[ - ]/g, '')
          .replace(/[ - ]/g, '')
          .replace(/[ - ]/g, '')
          .normalize('NFC')
          .replace(/[ - ]/g, '')
          .replace(/[ - ]/g, '')
          .replace(/[ - ]/g, '')
          .replace(/[^a-z0-9]/gi, '')
          .toLowerCase();

      const normMap = new Map<string, string>();
      headerRow.forEach((h) => {
        const key = String(h || '');
        if (key) normMap.set(normalizeHeader(key), key);
      });

      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const parsed: StudentItem[] = [];
      const failed: { row: number; reason: string }[] = [];

      const mapKeys = (row: any, keys: string[]) => {
        for (const candidate of keys) {
          const nc = normalizeHeader(candidate);
          if (normMap.has(nc)) {
            const original = normMap.get(nc)!;
            const v = row[original];
            if (v !== undefined && v !== null && String(v).trim() !== '') return v;
          }
        }
        // fallback: try to match by normalizing actual row keys
        for (const actualKey of Object.keys(row)) {
          const nk = normalizeHeader(actualKey);
          for (const candidate of keys) {
            if (nk === normalizeHeader(candidate)) {
              const v = row[actualKey];
              if (v !== undefined && v !== null && String(v).trim() !== '') return v;
            }
          }
        }
        return '';
      };

      rows.forEach((r, idx) => {
        const inst = String(
          mapKeys(r, [
            'institutionId',
            'institution_id',
            'ID',
            'Id',
            'id',
            'ID Institucional',
            'ID_institucional',
            'id_institucional',
            'Identificador',
          ])
        ).trim();
        const fn = String(mapKeys(r, ['firstNames', 'first_names', 'nombres', 'Nombres'])).trim();
        const ln = String(mapKeys(r, ['lastNames', 'last_names', 'apellidos', 'Apellidos'])).trim();
        const em = String(mapKeys(r, ['email', 'Email', 'correo', 'Correo', 'correo electrónico', 'correo_electronico', 'correo_electronico'])).trim();
        const gr = String(mapKeys(r, ['grade', 'grado', 'Grade', 'Grado'])).trim();
        const tp = String(mapKeys(r, ['tempPassword', 'temp_password', 'password', 'contraseña', 'Contraseña'])).trim();

        if (!inst || !fn || !ln || !em || !tp || !gr) {
          failed.push({ row: idx + 2, reason: 'Faltan campos obligatorios' });
          return;
        }
        if (!validateEmail(em)) {
          failed.push({ row: idx + 2, reason: 'Correo inválido' });
          return;
        }

        parsed.push({
          institutionId: inst,
          firstNames: fn,
          lastNames: ln,
          email: em,
          grade: gr,
          tempPassword: tp,
        });
      });

      if (parsed.length) {
        const dedupFailures: { row?: number; reason: string }[] = [];
        addUniqueToBatch(parsed, dedupFailures);
        const added = parsed.length - dedupFailures.length;
        if (added > 0) toast.success(`Se importaron ${added} estudiantes a la lista.`);
        if (dedupFailures.length > 0) {
          toast.warning(`${dedupFailures.length} filas omitidas por ID duplicado u otros errores.`);
          console.warn('Filas omitidas por duplicado:', dedupFailures.slice(0, 20));
        }
      }
      if (failed.length) {
        toast.warning(`${failed.length} filas omitidas por errores. Revisa el formato del archivo.`);
        console.warn('Filas fallidas al importar Excel:', failed.slice(0, 10));
      }
    } catch (err) {
      console.error('Error parsing excel', err);
      toast.error('Error leyendo el archivo. Asegúrate que es un Excel válido.');
    } finally {
      setIsParsing(false);
      // reset input so same file can be selected again if needed
      if (e.currentTarget) e.currentTarget.value = '';
    }
  }

  // Warn user when navigating away / reloading if there are unsaved changes
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    const onDocClick = (ev: MouseEvent) => {
      if (!isDirty) return;
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      if (anchor && anchor.href) {
        // allow same-page anchors or links that open in new tab
        if (anchor.target === '_blank') return;
        const confirmed = window.confirm('Tienes cambios sin guardar. ¿Seguro que quieres salir?');
        if (!confirmed) ev.preventDefault();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onDocClick);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onDocClick);
    };
  }, [isDirty]);

  // cleanup worker on unmount
  useEffect(() => {
    return () => {
      try {
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
      } catch (e) {
        // ignore
      }
    };
  }, []);

  // Track form inputs and batch to determine dirty state
  useEffect(() => {
    const formHasValues = Boolean(institutionId || firstNames || lastNames || email || tempPassword || grade);
    setIsDirty(batch.length > 0 || formHasValues);
  }, [institutionId, firstNames, lastNames, email, tempPassword, grade, batch.length]);

  const navigate = useNavigate();

  function scrollToHeader() {
    if (headerRef.current) headerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleCancelAll() {
    // Cancel parsing worker if running
    try {
      if (workerRef.current) {
        try {
          workerRef.current.terminate();
        } catch (e) {
          // ignore
        }
        workerRef.current = null;
      }
    } finally {
      parseAbortRef.current = true;
      uploadAbortRef.current = true;
      setIsParsing(false);
      setIsUploading(false);
      // reset UI progress
      setParseProgress(0);
      setParseTotal(0);
      setUploadProgress(0);
      setUploadTotal(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (import.meta.env?.DEV) setDebugLines([]);
      toast.info('Operación cancelada.');
    }
  }

  return (
    <div className="flex items-start justify-center px-4 py-2">
      <Card className={`mt-3 w-full max-w-5xl overflow-hidden rounded-2xl border shadow-md border-[var(--color-border)] bg-[color:var(--color-surface)] transition-transform`}>
        <CardContent className="p-6 sm:p-8">
          <div className="mx-auto w-full" ref={headerRef}>
            <div className="mb-2">
              <button
                onClick={() => navigate('/admin/users')}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-muted)]"
                type="button"
                aria-label="Volver a usuarios"
              >
                <ChevronLeft className="h-4 w-4" />
                Volver
              </button>
            </div>
            <div className="mb-3 flex items-center gap-3">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[color:var(--color-primary)] text-white shadow-sm" aria-hidden="true">
                <User className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">Crear usuario</h1>
            </div>

            {/* validation messages appear as toasts in top-right */}

            <div className="space-y-6 text-[color:var(--color-text)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">ID Institucional</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-placeholder)]">
                      <Hash className="h-4 w-4" />
                    </div>
                    <Input value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} placeholder="Ej: 2025001" className="w-full rounded-xl border px-4 py-3 pl-10 border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] placeholder:text-[color:var(--color-placeholder)]" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Nombres</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-placeholder)]">
                      <User className="h-4 w-4" />
                    </div>
                    <Input value={firstNames} onChange={(e) => setFirstNames(e.target.value)} placeholder="Juan Carlos" className="w-full rounded-xl border px-4 py-3 pl-10 border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Apellidos</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-placeholder)]">
                      <User className="h-4 w-4" />
                    </div>
                    <Input value={lastNames} onChange={(e) => setLastNames(e.target.value)} placeholder="Pérez López" className="w-full rounded-xl border px-4 py-3 pl-10 border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Correo</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-placeholder)]">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@colegio.edu.ni" className="w-full rounded-xl border px-4 py-3 pl-10 border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Rol</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-placeholder)]">
                      <Users className="h-4 w-4" />
                    </div>
                    <select value={roleId} onChange={(e) => { const v = Number(e.target.value); setRoleId(v); if (v !== 3) setGrade(''); }} className="w-full rounded-xl border px-4 py-3 pl-10 border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]">
                      <option value={2}>Teacher</option>
                      <option value={3}>Student</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Grado</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-placeholder)]">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full rounded-xl border px-4 py-3 pl-10 border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]">
                    <option value="">Selecciona grado</option>
                    <option value="7mo B">7mo B</option>
                    <option value="7mo A">7mo A</option>
                    <option value="8vo A">8vo A</option>
                    <option value="8vo B">8vo B</option>
                    <option value="9no A">9no A</option>
                    <option value="10mo A">10mo A</option>
                    <option value="11mo A">11mo A</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Contraseña</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-placeholder)]">
                      <Key className="h-4 w-4" />
                    </div>
                    <Input type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="Ej: abc12345" className="w-full rounded-xl border px-4 py-3 pl-10 border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]" />
                  </div>
                </div>

                <div className="lg:col-span-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                  <input ref={fileInputRef} onChange={handleExcelFileWorker} accept=".xlsx,.xls,.csv" type="file" className="hidden" />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isParsing} size="md" className="w-full sm:w-auto">{isParsing ? (parseTotal > 0 ? <><FileText className="h-4 w-4 mr-2"/> {`Importando… (${parseProgress}/${parseTotal})`}</> : <><FileText className="h-4 w-4 mr-2"/> Importando…</>) : <><FileText className="h-4 w-4 mr-2"/> Importar Excel</>}</Button>
                  <button
                    type="button"
                    onClick={() => setShowExcelHelp((s) => !s)}
                    title="Cómo debe estar el archivo"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-muted)]"
                  >
                    <Info className="h-4 w-4" />
                  </button>

                  <Button onClick={handleAddToBatch} disabled={isParsing || isUploading || isCreating || Number(roleId) !== 3} size="md" className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2"/>Agregar a la lista</Button>
                  <Button onClick={handleUploadBatch} disabled={isUploading || isParsing || batch.length === 0} size="md" variant="primary" className="w-full sm:w-auto">{isUploading ? <><UploadCloud className="h-4 w-4 mr-2"/> {`Subiendo… (${uploadProgress}/${uploadTotal || batch.length})`}</> : <><UploadCloud className="h-4 w-4 mr-2"/> {`Subir todos (${batch.length})`}</>}</Button>
                  <Button onClick={handleCreateUser} disabled={isCreating || isParsing} size="md" variant="primary" className="w-full sm:w-auto">{isCreating ? 'Creando…' : <><UserPlus className="h-4 w-4 mr-2"/> Crear usuario</>}</Button>
                </div>
                {/* Progress bars */}
                <div className="lg:col-span-4 mt-3">
                  {isParsing && (
                    <div className="mb-2">
                      <div className="mb-1 text-sm text-[color:var(--color-text)]/80">Importando: {parseTotal > 0 ? `${parseProgress} / ${parseTotal}` : 'Procesando…'}</div>
                      <div className="w-full h-2 rounded-full bg-[color:var(--color-border)] overflow-hidden">
                        <div style={{ width: parseTotal > 0 ? `${Math.min(100, Math.round((parseProgress / parseTotal) * 100))}%` : '100%' }} className="h-2 bg-[color:var(--color-primary)] transition-all" />
                      </div>
                    </div>
                  )}

                  {isUploading && (
                    <div className="mb-2">
                      <div className="mb-1 text-sm text-[color:var(--color-text)]/80">Subiendo: {uploadTotal > 0 ? `${uploadProgress} / ${uploadTotal}` : `${uploadProgress}`}</div>
                      <div className="w-full h-2 rounded-full bg-[color:var(--color-border)] overflow-hidden">
                        <div style={{ width: uploadTotal > 0 ? `${Math.min(100, Math.round((uploadProgress / uploadTotal) * 100))}%` : '0%' }} className="h-2 bg-[color:var(--color-primary)] transition-all" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

                <div className="rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-medium inline-flex items-center gap-2"><Users className="h-5 w-5"/> Estudiantes agregados ({batch.length})</div>
                  <div className="text-sm text-[color:var(--color-text)]/70">Revisa antes de subir</div>
                </div>

                {showExcelHelp && (
                  <div className="mb-3 rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] p-3 text-sm text-[color:var(--color-text)]/90">
                    <strong className="block mb-1">Formato esperado del Excel</strong>
                    <div>- Encabezado en la primera fila con columnas: <code>ID</code>, <code>Nombres</code>, <code>Apellidos</code>, <code>Correo</code>, <code>Grado</code>, <code>Contraseña</code></div>
                    <div className="mt-2">- Nombres de columna alternativos aceptados: <code>institutionId</code>, <code>firstNames</code>, <code>lastNames</code>, <code>email</code>, <code>grade</code>, <code>tempPassword</code>.</div>
                    <div className="mt-2">- Todas las columnas son obligatorias para cada fila. Si falta algo, la fila será omitida y verás un aviso.</div>
                    <div className="mt-2">- Formatos: .xlsx, .xls o .csv. Evita filas vacías antes de los datos.</div>
                  </div>
                )}

              {/* mensajes de validación mostrados arriba (debajo del título) */}

                {batch.length === 0 ? (
                  <div className="text-sm text-[color:var(--color-text)]/70">No hay estudiantes en la lista. Usa el formulario de arriba para agregarlos.</div>
                ) : (
                  <>
                    {/* Desktop / tablet: table view */}
                    <div className="hidden sm:block overflow-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-[color:var(--color-text)]/80">
                            <th className="py-2">#</th>
                            <th className="py-2"><div className="inline-flex items-center gap-2"><IdCard className="h-4 w-4"/>ID</div></th>
                            <th className="py-2"><div className="inline-flex items-center gap-2"><User className="h-4 w-4"/>Nombre</div></th>
                            <th className="py-2"><div className="inline-flex items-center gap-2"><Mail className="h-4 w-4"/>Correo</div></th>
                            <th className="py-2"><div className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4"/>Grado</div></th>
                            <th className="py-2"><div className="inline-flex items-center gap-2"><Trash className="h-4 w-4"/>Acción</div></th>
                          </tr>
                        </thead>
                        <tbody>
                          {batch.map((s, i) => (
                            <tr key={`${s.email}-${i}`} className="border-t border-[var(--color-border)]">
                              <td className="py-2 align-top">{i + 1}</td>
                              <td className="py-2 align-top">{s.institutionId}</td>
                              <td className="py-2 align-top">{s.firstNames} {s.lastNames}</td>
                              <td className="py-2 align-top">{s.email}</td>
                              <td className="py-2 align-top">{s.grade}</td>
                              <td className="py-2 align-top">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromBatch(i)}
                                  aria-label={`Eliminar estudiante ${s.firstNames} ${s.lastNames}`}
                                  className="rounded-md p-1 text-xs border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
                                >
                                  <Trash className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile: compact card/list view */}
                    <div className="block sm:hidden space-y-3">
                      {batch.map((s, i) => (
                        <div key={`${s.email}-${i}`} className="rounded-md border border-[var(--color-border)] p-3 bg-[color:var(--color-surface)]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-[color:var(--color-text)]/70">#{i + 1} • <span className="font-medium inline-flex items-center gap-2"><Hash className="h-3 w-3"/>{s.institutionId}</span></div>
                              <div className="mt-1 text-sm font-semibold truncate inline-flex items-center gap-2"><User className="h-4 w-4"/>{s.firstNames} {s.lastNames}</div>
                              <div className="mt-1 text-sm text-[color:var(--color-text)]/80 truncate inline-flex items-center gap-2"><Mail className="h-4 w-4"/>{s.email}</div>
                              <div className="mt-1 text-xs text-[color:var(--color-text)]/70 inline-flex items-center gap-2"><GraduationCap className="h-3 w-3"/>{s.grade}</div>
                            </div>
                            <div className="flex-shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromBatch(i)}
                                aria-label={`Eliminar estudiante ${s.firstNames} ${s.lastNames}`}
                                className="rounded-md p-2 text-xs border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
                              >
                                <Trash className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <p className="mt-1 text-center text-xs text-[color:var(--color-text)]/70">Recuerda compartir la contraseña de forma segura.</p>
          </div>
        </CardContent>
      </Card>
          <button
            type="button"
            onClick={scrollToHeader}
            aria-label="Ir al encabezado"
            className="fixed right-4 bottom-6 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--color-primary)] text-white shadow-lg hover:opacity-90"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
                {/* Modal progress overlay (prominent) */}
                {(isParsing || isUploading) && createPortal(
                  <div className="fixed inset-0" style={{ zIndex: 9999999999, pointerEvents: 'auto' }}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" style={{ zIndex: 9999999999 }} />
                    <div role="dialog" aria-modal="true" style={{ zIndex: 10000000000 }} className="relative mx-auto w-full max-w-2xl rounded-xl bg-[color:var(--color-surface)] p-6 shadow-2xl border border-[var(--color-border)] top-1/3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-[color:var(--color-text)]">{isParsing ? 'Importando archivo' : 'Subiendo estudiantes'}</h3>
                          <p className="mt-1 text-sm text-[color:var(--color-text)]/80">
                            {isParsing
                              ? (parseTotal > 0 ? `Filas procesadas: ${parseProgress} / ${parseTotal}` : 'Procesando archivo...')
                              : (uploadTotal > 0 ? `Progreso: ${uploadProgress} / ${uploadTotal}` : `Progreso: ${uploadProgress}`)}
                          </p>
                        </div>
                        <div className="text-sm text-[color:var(--color-text)]/60">Por favor espera...</div>
                      </div>

                      <div className="mt-4">
                        <div className="w-full h-4 rounded-full bg-[color:var(--color-border)] overflow-hidden">
                          <div
                            className="h-4 bg-[color:var(--color-primary)] transition-all"
                            style={{
                              width: (() => {
                                if (isParsing) {
                                  return parseTotal > 0 ? `${Math.min(100, Math.round((parseProgress / parseTotal) * 100))}%` : '20%';
                                }
                                if (isUploading) {
                                  return uploadTotal > 0 ? `${Math.min(100, Math.round((uploadProgress / uploadTotal) * 100))}%` : '0%';
                                }
                                return '0%';
                              })(),
                            }}
                          />
                        </div>
                        <div className="mt-2 text-sm text-[color:var(--color-text)]/80">{isParsing ? `${parseProgress} / ${parseTotal}` : `${uploadProgress} / ${uploadTotal}`}</div>
                        {import.meta.env?.DEV && debugLines.length > 0 && (
                          <div className="mt-2 text-xs text-[color:var(--color-text)]/60 max-h-28 overflow-auto rounded-md border border-[var(--color-border)] p-2">
                            {debugLines.map((line, idx) => (
                              // eslint-disable-next-line react/no-array-index-key
                              <div key={idx} className="truncate">{line}</div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={handleCancelAll}
                          className="rounded-md px-4 py-2 text-sm border border-[var(--color-border)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-muted)]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>, document.body)}
    </div>
  );
}
