import { useState, type JSX } from 'react';
import { supabase } from '@/core/api/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
    <div className="max-w-md mx-auto mt-20 p-6 border rounded-lg shadow bg-white">
      <h2 className="text-2xl font-bold mb-4">Crear usuario (Admin)</h2>

      <label className="block mt-2 mb-1">ID Institucional</label>
      <Input value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} placeholder="Ej: 2025001" />

      <label className="block mt-2 mb-1">Nombres</label>
      <Input value={firstNames} onChange={(e) => setFirstNames(e.target.value)} placeholder="Juan Carlos" />

      <label className="block mt-2 mb-1">Apellidos</label>
      <Input value={lastNames} onChange={(e) => setLastNames(e.target.value)} placeholder="Pérez López" />

      <label className="block mt-2 mb-1">Correo</label>
      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@colegio.edu.ni" />

      <label className="block mt-2 mb-1">Rol</label>
      <select
        className="w-full rounded-xl border px-3 py-2"
        value={roleId}
        onChange={(e) => setRoleId(Number(e.target.value))}
      >
        <option value={2}>Teacher</option>
        <option value={3}>Student</option>
      </select>

      <label className="block mt-2 mb-1">Contraseña temporal</label>
      <Input type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="Ej: abc12345" />

      <Button onClick={handleCreateUser} disabled={isLoading} className="mt-4 w-full">
        {isLoading ? 'Creando...' : 'Crear usuario'}
      </Button>

      {msg && <p className="mt-4 text-center text-sm text-red-600">{msg}</p>}
    </div>
  );
}