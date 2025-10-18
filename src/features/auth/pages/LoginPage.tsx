// src/features/auth/pages/LoginPage.tsx
import { useState } from 'react';
import { supabase } from '@/core/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [msg, setMsg] = useState('');
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            setMsg('');
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;

            setMsg('Login exitoso!');
            // Redirigir al dashboard protegido
            navigate('/dashboard');
        } catch (err: any) {
            setMsg(err.message);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-20 p-6 border rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Login</h2>

            <label className="block mb-2">Correo electrónico</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

            <label className="block mt-4 mb-2">Contraseña</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

            <Button className="mt-6 w-full" onClick={handleLogin}>Iniciar Sesión</Button>

            {msg && <p className="mt-4 text-red-500">{msg}</p>}
        </div>
    );
}
