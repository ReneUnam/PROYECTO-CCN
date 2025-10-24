import { useState } from 'react';
import { supabase } from '@/core/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [msg, setMsg] = useState('');
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            setMsg('');

            const normalizedId = studentId.trim().toLowerCase();

            // 1️⃣ Buscar el correo asociado al ID
            const { data: allowedUser, error: findError } = await supabase
                .from('allowed_users')
                .select('email')
                .eq('student_id', normalizedId)
                .single();

            if (findError || !allowedUser) {
                throw new Error('ID no encontrado o no autorizado');
            }

            const email = allowedUser.email;
            if (!email) {
                throw new Error('Este ID no tiene un correo asociado');
            }

            // 2️⃣ Hacer login con email y contraseña
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (loginError) throw loginError;

            setMsg('✅ Inicio de sesión exitoso!');

            navigate('/dashboard');
        } catch (err: any) {
            setMsg(`⚠️ ${err.message}`);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-20 p-6 border rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Inicio de sesión</h2>

            <label className="block mb-2">ID de estudiante</label>
            <Input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Ejemplo: 12345rene"
            />

            <label className="block mt-4 mb-2">Contraseña</label>
            <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
            />

            <Button className="mt-6 w-full" onClick={handleLogin}>
                Iniciar sesión
            </Button>

            {msg && <p className="mt-4 text-red-500">{msg}</p>}
        </div>
    );
}
