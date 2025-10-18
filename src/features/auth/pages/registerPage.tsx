// src/features/auth/pages/RegisterPage.tsx
import { useState } from 'react';
import { signUp } from '../api/authApi';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
    const [studentId, setStudentId] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [msg, setMsg] = useState('');
    const navigate = useNavigate();

    const handleRegister = async () => {
        try {
            setMsg('');

            // Normalizar inputs
            const normalizedStudentId = studentId.trim().toLowerCase();
            const normalizedEmail = email.trim().toLowerCase();
            const normalizedPassword = password.trim();

            if (!normalizedStudentId || !normalizedEmail || !normalizedPassword) {
                setMsg('Todos los campos son obligatorios');
                return;
            }

            await signUp({
                studentId: normalizedStudentId,
                email: normalizedEmail,
                password: normalizedPassword,
            });

            setMsg('Usuario registrado con éxito! Ahora haz login.');
            // navigate('/login');
        } catch (err: any) {
            setMsg(err.message);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-20 p-6 border rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Registro Estudiante</h2>

            <label className="block mb-2">ID de estudiante</label>
            <Input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Ej: 2025001"
            />

            <label className="block mt-4 mb-2">Correo electrónico</label>
            <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@colegio.edu.ni"
            />

            <label className="block mt-4 mb-2">Contraseña</label>
            <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
            />

            <Button className="mt-6 w-full" onClick={handleRegister}>
                Registrarse
            </Button>

            {msg && <p className="mt-4 text-red-500">{msg}</p>}
        </div>
    );
}
