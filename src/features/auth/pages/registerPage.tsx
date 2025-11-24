import { useState, type JSX } from 'react';
import { supabase } from '@/core/api/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/core/components/Cards';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/components/toast/ToastProvider';

export function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role_id !== 1) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function RegisterPage() {
  const [institutionId, setInstitutionId] = useState('');
  const [firstNames, setFirstNames] = useState('');
  const [lastNames, setLastNames] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(3); // 2=teacher, 3=student
  const [tempPassword, setTempPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreateUser() {
    try {
      setMsg('');
      setIsLoading(true);

      // 1) Verifica sesión real
      const { data: s } = await supabase.auth.getUser();
      if (!s.user) {
        setMsg('Inicia sesión como administrador.');
        return;
      }

      // 2) Confirma que eres admin en DB
      const { data: who, error: whoErr } = await supabase.rpc('debug_whoami');
      if (whoErr) throw whoErr;
      const isAdmin = who?.[0]?.is_admin === true;
      if (!isAdmin) {
        setMsg('Solo un admin puede crear perfiles.');
        return;
      }

      // Validaciones
      if (!institutionId || !firstNames || !lastNames || !email || !tempPassword) {
        setMsg('Todos los campos son obligatorios');
        return;
      }
      if (![2, 3].includes(Number(roleId))) {
        setMsg('El rol Admin no se crea desde aquí.');
        return;
      }

      // 3) Llama la RPC segura (NO insert directo)
      const { error } = await supabase.rpc('admin_create_profile', {
        p_institution_id: institutionId.trim(),
        p_first_names: firstNames.trim(),
        p_last_names: lastNames.trim(),
        p_email: email.trim(),
        p_role_id: Number(roleId), // 2 o 3
        p_grade: null,
        p_temp_password: tempPassword.trim(),
      });

      if (error) throw error;

      const createdName = `${firstNames} ${lastNames}`.trim();
      setMsg(`Usuario creado. Contraseña temporal: ${tempPassword}`);
      toast.success(`Usuario creado: ${createdName}`);
      // success animation trigger
      setSaved(true);
      setTimeout(() => setSaved(false), 900);
      // clear inputs and redirect to admin users after short delay
      setTimeout(() => {
        setInstitutionId('');
        setFirstNames('');
        setLastNames('');
        setEmail('');
        setTempPassword('');
        setRoleId(3);
        navigate('/admin/users', { state: { createdName } });
      }, 700);
    } catch (err: any) {
      // Muestra detalle útil cuando venga 403/401
      const detail = err?.message || err?.error_description || 'No autorizado o función no disponible.';
      setMsg(detail);
      console.error('create_profile RPC error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const toast = useToast();
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex items-start justify-center px-4 py-6">
      <Card className={`mt-6 w-full max-w-2xl overflow-hidden rounded-2xl border shadow-md border-[var(--color-border)] bg-[color:var(--color-surface)] transition-transform ${saved ? 'scale-105 shadow-lg' : ''}`}>
        <CardContent className="p-6 sm:p-8">
          <div className="mx-auto w-full">
            <h1 className="mb-4 text-center text-2xl font-semibold text-[color:var(--color-text)]">Crear usuario</h1>

            <div className="space-y-4 text-[color:var(--color-text)]">
              <div>
                <label className="mb-2 block text-sm font-medium opacity-90">ID Institucional</label>
                <Input
                  value={institutionId}
                  onChange={(e) => setInstitutionId(e.target.value)}
                  placeholder="Ej: 2025001"
                  className="w-full rounded-xl border px-4 py-3 border-[var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Nombres</label>
                  <Input value={firstNames} onChange={(e) => setFirstNames(e.target.value)} placeholder="Juan Carlos" className="w-full rounded-xl" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Apellidos</label>
                  <Input value={lastNames} onChange={(e) => setLastNames(e.target.value)} placeholder="Pérez López" className="w-full rounded-xl" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium opacity-90">Correo</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@colegio.edu.ni" className="w-full rounded-xl" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Rol</label>
                  <select value={roleId} onChange={(e) => setRoleId(Number(e.target.value))} className="w-full rounded-xl border px-4 py-3 border-[var(--color-border)] bg-[color:var(--color-surface)]">
                    <option value={2}>Teacher</option>
                    <option value={3}>Student</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Contraseña temporal</label>
                  <Input type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="Ej: abc12345" className="w-full rounded-xl" />
                </div>
              </div>

              <Button onClick={handleCreateUser} disabled={isLoading} className="w-full" size="lg" variant="primary">
                {isLoading ? "Creando…" : "Crear usuario"}
              </Button>

              {msg && <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">{msg}</p>}

              <p className="text-center text-xs text-[color:var(--color-text)]/70">Recuerda compartir la contraseña de forma segura.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}