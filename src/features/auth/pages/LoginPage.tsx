import { useState } from 'react';
import { signIn } from '@/features/auth/api/authApi';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/core/components/Cards';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [msg, setMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

        const handleLogin = async () => {
            try {
                setMsg('');
                setIsLoading(true);

                await signIn({ studentId, password });

                setMsg('Inicio de sesión exitoso. Redirigiendo...');
                navigate('/dashboard');
            } catch (err: any) {
                setMsg(err?.message ? `⚠️ ${err.message}` : '⚠️ Ocurrió un error');
            } finally {
                setIsLoading(false);
            }
        };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
            <Card className="w-full max-w-4xl overflow-hidden rounded-3xl shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Left: logo + branding */}
                    <div className="hidden md:flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-primary/80 to-secondary/80 p-10 text-white">
                        <img src="/logo.png" alt="Colegio Central de Nicaragua Logo" className="h-36 w-36 object-contain" />
                        <div className="text-center">
                            <h2 className="text-3xl font-extrabold">Colegio Central de Nicaragua</h2>
                            <p className="mt-2 max-w-xs text-sm text-white/90">Bienvenido — ingresa con tu carnet y contraseña para acceder a tu espacio personal de bienestar.</p>
                        </div>
                    </div>

                    {/* Right: form */}
                    <CardContent className="p-8">
                        <div className="mx-auto max-w-md">
                            <h1 className="mb-4 text-center text-4xl font-bold text-indigo-800">Inicio de sesión</h1>
                            <p className="mb-6 text-center text-sm text-gray-600">Ingresa tus credenciales para acceder a la aplicación.</p>

                            <div className="space-y-5">
                                {/* Student ID */}
                                <div>
                                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <User className="h-4 w-4 text-indigo-700" /> <span>Carnet</span>
                                    </label>
                                    <Input
                                        value={studentId}
                                        onChange={(e) => setStudentId(e.target.value)}
                                        placeholder="Ej: 12345rene"
                                        className="rounded-xl border border-border bg-white/70 shadow-sm px-4 py-3"
                                        aria-label="Carnet"
                                    />
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <Lock className="h-4 w-4 text-indigo-700" /> <span>Contraseña</span>
                                    </label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="********"
                                            className="w-full rounded-xl border border-border bg-white/70 shadow-sm px-4 py-3 pr-12"
                                            aria-label="Contraseña"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((s) => !s)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <a href="#" className="text-sm text-indigo-600 hover:text-indigo-800">¿Olvidó su contraseña?</a>
                                </div>

                                <div>
                                    <Button
                                        onClick={handleLogin}
                                        disabled={isLoading}
                                        className="w-full rounded-full bg-indigo-700 py-3 text-lg font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
                                    >
                                        {isLoading ? 'Ingresando...' : 'Ingresar'}
                                    </Button>
                                </div>

                                {/* Mensajes */}
                                {msg && (
                                    <p className={`mt-2 text-center text-sm ${msg.startsWith('Inicio') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </div>
            </Card>
        </div>
    );
}
