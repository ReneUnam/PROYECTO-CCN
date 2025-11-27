import { useState, useEffect, type JSX } from 'react';
import { supabase } from '@/core/api/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/core/components/Cards';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/components/toast/ToastProvider';
import { ChevronLeft, Trash } from 'lucide-react';

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
  const [batch, setBatch] = useState<StudentItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  function validateEmail(addr: string) {
    return typeof addr === 'string' && addr.includes('@');
  }

  async function handleCreateUser() {
    try {
      setIsLoading(true);

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
      setIsLoading(false);
    }
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
    // use toast for messages
    if (!batch.length) {
      toast.warning('La lista está vacía. Agrega estudiantes antes de subir.');
      return;
    }
    setIsLoading(true);
    try {
      const ok = await ensureAdmin();
      if (!ok) return;

      const results: { success: number; failed: { idx: number; error: any }[] } = { success: 0, failed: [] };

      for (let i = 0; i < batch.length; i++) {
        const s = batch[i];
        try {
          const { error } = await supabase.rpc('admin_create_profile', {
            p_institution_id: s.institutionId,
            p_first_names: s.firstNames,
            p_last_names: s.lastNames,
            p_email: s.email,
            p_role_id: 3,
            p_grade: s.grade ?? null,
            p_temp_password: s.tempPassword,
          });
          if (error) throw error;
          results.success += 1;
        } catch (err) {
          results.failed.push({ idx: i, error: err });
          console.error('Batch create error for index', i, err);
        }
      }

      if (results.failed.length === 0) {
        toast.success(`Subidos ${results.success} estudiantes`);
        setBatch([]);
        setIsDirty(false);
      } else {
        toast.warning(`Se subieron ${results.success} estudiantes. ${results.failed.length} fallaron.`);
        // remove successful ones from batch, keep failed entries for retry
        const failedSet = new Set(results.failed.map((f) => f.idx));
        setBatch((prev) => prev.filter((_, i) => failedSet.has(i)));
        setIsDirty(true);
      }
    } catch (err: any) {
      const detail = err?.message || 'Error al subir la lista.';
      toast.error(detail);
      console.error('upload batch error:', err);
    } finally {
      setIsLoading(false);
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

  // Track form inputs and batch to determine dirty state
  useEffect(() => {
    const formHasValues = Boolean(institutionId || firstNames || lastNames || email || tempPassword || grade);
    setIsDirty(batch.length > 0 || formHasValues);
  }, [institutionId, firstNames, lastNames, email, tempPassword, grade, batch.length]);

  const navigate = useNavigate();

  return (
    <div className="flex items-start justify-center px-4 py-4">
      <Card className={`mt-4 w-full max-w-5xl overflow-hidden rounded-2xl border shadow-md border-[var(--color-border)] bg-[color:var(--color-surface)] transition-transform`}>
        <CardContent className="p-8 sm:p-10">
          <div className="mx-auto w-full">
            <div className="mb-4">
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
            <h1 className="mb-4 text-center text-2xl font-semibold text-[color:var(--color-text)]">Crear usuario</h1>

            {/* validation messages appear as toasts in top-right */}

            <div className="space-y-6 text-[color:var(--color-text)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">ID Institucional</label>
                  <Input value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} placeholder="Ej: 2025001" className="w-full rounded-xl border px-4 py-3 border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] placeholder:text-[color:var(--color-placeholder)]" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Nombres</label>
                  <Input value={firstNames} onChange={(e) => setFirstNames(e.target.value)} placeholder="Juan Carlos" className="w-full rounded-xl border px-4 py-3 border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Apellidos</label>
                  <Input value={lastNames} onChange={(e) => setLastNames(e.target.value)} placeholder="Pérez López" className="w-full rounded-xl border px-4 py-3 border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Correo</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@colegio.edu.ni" className="w-full rounded-xl border px-4 py-3 border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Rol</label>
                  <select value={roleId} onChange={(e) => { const v = Number(e.target.value); setRoleId(v); if (v !== 3) setGrade(''); }} className="w-full rounded-xl border px-4 py-3 border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]">
                    <option value={2}>Teacher</option>
                    <option value={3}>Student</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Grado</label>
                  <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full rounded-xl border px-4 py-3 border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]">
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

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Contraseña temporal</label>
                  <Input type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="Ej: abc12345" className="w-full rounded-xl border px-4 py-3 border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]" />
                </div>

                <div className="lg:col-span-4 flex items-center justify-end gap-3">
                  <Button onClick={handleAddToBatch} disabled={isLoading || Number(roleId) !== 3} size="md">Agregar a la lista</Button>
                  <Button onClick={handleUploadBatch} disabled={isLoading || batch.length === 0} size="md" variant="primary">{isLoading ? 'Subiendo…' : `Subir todos (${batch.length})`}</Button>
                  <Button onClick={handleCreateUser} disabled={isLoading} size="md" variant="primary">{isLoading ? 'Creando…' : 'Crear usuario'}</Button>
                </div>
              </div>

              <div className="rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-medium">Estudiantes agregados ({batch.length})</div>
                  <div className="text-sm text-[color:var(--color-text)]/70">Revisa antes de subir</div>
                </div>

              {/* mensajes de validación mostrados arriba (debajo del título) */}

                {batch.length === 0 ? (
                  <div className="text-sm text-[color:var(--color-text)]/70">No hay estudiantes en la lista. Usa el formulario de arriba para agregarlos.</div>
                ) : (
                  <div className="overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-[color:var(--color-text)]/80">
                          <th className="py-2">#</th>
                          <th className="py-2">ID</th>
                          <th className="py-2">Nombre</th>
                          <th className="py-2">Correo</th>
                          <th className="py-2">Grado</th>
                          <th className="py-2">Acción</th>
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
                                className="rounded-md p-1 text-xs border border-[var(--color-border)] flex items-center justify-center"
                              >
                                <Trash className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <p className="mt-1 text-center text-xs text-[color:var(--color-text)]/70">Recuerda compartir la contraseña de forma segura.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}