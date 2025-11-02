import { useState } from 'react';
import { supabase } from '@/core/api/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
    const [institutionId, setInstitutionId] = useState('');
    const [firstNames, setFirstNames] = useState('');
    const [lastNames, setLastNames] = useState('');
    const [email, setEmail] = useState('');
    const [roleId, setRoleId] = useState(3); // 1=admin,2=teacher,3=student
    const [tempPassword, setTempPassword] = useState('');
    const [msg, setMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateUser = async () => {
        try {
            setMsg('');
            setIsLoading(true);

            if (!institutionId || !firstNames || !lastNames || !email || !tempPassword) {
                setMsg('Todos los campos son obligatorios');
                return;
            }

            // Insertar en profiles
            const { error } = await supabase.from('profiles').insert({
                institution_id: institutionId.trim(),
                password_temp: tempPassword.trim(),
                first_names: firstNames.trim(),
                last_names: lastNames.trim(),
                email: email.trim(),
                is_registered: false,
                role_id: roleId,
            });

            if (error) throw error;

            setMsg(`Usuario creado correctamente. Contraseña temporal: ${tempPassword}`);
            // Limpiar campos
            setInstitutionId('');
            setFirstNames('');
            setLastNames('');
            setEmail('');
            setTempPassword('');
        } catch (err: any) {
            setMsg(err.message || 'Ocurrió un error al crear usuario');
        } finally {
            setIsLoading(false);
        }
    };

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
                <option value={1}>Admin</option>
                <option value={2}>Teacher</option>
                <option value={3}>Student</option>
            </select>

            <label className="block mt-2 mb-1">Contraseña temporal</label>
            <Input
                type="text"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="Ej: abc12345"
            />

            <Button onClick={handleCreateUser} disabled={isLoading} className="mt-4 w-full">
                {isLoading ? 'Creando...' : 'Crear usuario'}
            </Button>

            {msg && <p className="mt-4 text-center text-sm text-red-600">{msg}</p>}
        </div>
    );
}
