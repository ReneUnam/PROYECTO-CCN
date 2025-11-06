import { useState, type JSX } from 'react';
import { supabase } from '@/core/api/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/core/components/Cards';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

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

      setMsg(`Usuario creado. Contraseña temporal: ${tempPassword}`);
      setInstitutionId('');
      setFirstNames('');
      setLastNames('');
      setEmail('');
      setTempPassword('');
      setRoleId(3);
    } catch (err: any) {
      // Muestra detalle útil cuando venga 403/401
      const detail = err?.message || err?.error_description || 'No autorizado o función no disponible.';
      setMsg(detail);
      console.error('create_profile RPC error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-4xl overflow-hidden rounded-2xl border shadow-2xl backdrop-blur md:rounded-3xl
                       border-[var(--color-border)] bg-[color:var(--color-surface)]">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Banner móvil */}
          <div className="md:hidden flex flex-col items-center gap-3 px-6 py-8 text-white
                bg-gradient-to-r from-[color:var(--color-primary)] to-[color:var(--color-secondary)]">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-30 w-30 object-contain logo-stroke-white"
              style={{ ['--stroke' as any]: '2px' }}
            />
            <h2 className="text-2xl text-center font-extrabold">Panel de administración</h2>
            <p className="max-w-sm text-center text-xs/5 opacity-90">
              Crear usuarios docentes o estudiantes con contraseña temporal.
            </p>
          </div>

          {/* Banner desktop */}
          <div className="hidden md:flex flex-col items-center justify-center gap-6 p-10 text-white
                bg-gradient-to-b from-[color:var(--color-primary)] to-[color:var(--color-secondary)]">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-36 w-36 object-contain logo-stroke-white"
              style={{ ['--stroke' as any]: '2px' }}
            />
            <h2 className="text-3xl text-center font-extrabold">Panel de administración</h2>
            <p className="mt-2 max-w-xs text-sm opacity-90">
              Crea perfiles con ID institucional y contraseña temporal.
            </p>
          </div>

          <CardContent className="p-6 sm:p-8">
            <div className="mx-auto w-full max-w-md">
              <h1 className="mb-4 text-center text-3xl font-bold sm:text-4xl text-[color:var(--color-text)]">
                Crear usuario (Admin)
              </h1>

              <div className="space-y-5 text-[color:var(--color-text)]">
                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">ID Institucional</label>
                  <Input
                    value={institutionId}
                    onChange={(e) => setInstitutionId(e.target.value)}
                    placeholder="Ej: 2025001"
                    className="w-full rounded-xl border px-4 py-3
                               border-[var(--color-border)] bg-[color:var(--color-surface)]
                               text-[color:var(--color-text)] placeholder:text-slate-400
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Nombres</label>
                  <Input
                    value={firstNames}
                    onChange={(e) => setFirstNames(e.target.value)}
                    placeholder="Juan Carlos"
                    className="w-full rounded-xl border px-4 py-3
                               border-[var(--color-border)] bg-[color:var(--color-surface)]
                               text-[color:var(--color-text)] placeholder:text-slate-400
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Apellidos</label>
                  <Input
                    value={lastNames}
                    onChange={(e) => setLastNames(e.target.value)}
                    placeholder="Pérez López"
                    className="w-full rounded-xl border px-4 py-3
                               border-[var(--color-border)] bg-[color:var(--color-surface)]
                               text-[color:var(--color-text)] placeholder:text-slate-400
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Correo</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@colegio.edu.ni"
                    className="w-full rounded-xl border px-4 py-3
                               border-[var(--color-border)] bg-[color:var(--color-surface)]
                               text-[color:var(--color-text)] placeholder:text-slate-400
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Rol</label>
                  <select
                    className="w-full appearance-none rounded-xl border px-4 py-3
                               border-[var(--color-border)] bg-[color:var(--color-surface)]
                               text-[color:var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                    value={roleId}
                    onChange={(e) => setRoleId(Number(e.target.value))}
                  >
                    <option value={2}>Teacher</option>
                    <option value={3}>Student</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium opacity-90">Contraseña temporal</label>
                  <Input
                    type="text"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="Ej: abc12345"
                    className="w-full rounded-xl border px-4 py-3
                               border-[var(--color-border)] bg-[color:var(--color-surface)]
                               text-[color:var(--color-text)] placeholder:text-slate-400
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                  />
                </div>

                <Button
                  onClick={handleCreateUser}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                  variant="primary"
                >
                  {isLoading ? 'Creando…' : 'Crear usuario'}
                </Button>

                {msg && (
                  <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">{msg}</p>
                )}

                <p className="text-center text-xs text-[color:var(--color-text)]/70">
                  Recuerda compartir la contraseña temporal de forma segura.
                </p>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}