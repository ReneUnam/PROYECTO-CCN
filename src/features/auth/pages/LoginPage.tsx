import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/core/components/Cards';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { registerAuthFromTemp, signIn, verifyTempCredentials } from '@/features/auth/api/authApi';

export default function LoginPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [msg, setMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (!loading && user) navigate('/dashboard', { replace: true });
    }, [loading, user, navigate]);

    const handleLogin = async () => {
        try {
            setMsg('');
            setIsLoading(true);

            const tempCheck = await verifyTempCredentials({ studentId, tempPassword: password }).catch(() => null);
            if (tempCheck && !tempCheck.is_registered) {
                await registerAuthFromTemp({ email: tempCheck.email, tempPassword: password });
                sessionStorage.setItem('pendingEmail', tempCheck.email);
                return navigate('/auth/verify-email', { replace: true, state: { email: tempCheck.email } });
            }

            await signIn({ studentId, password });
            navigate('/dashboard');
        } catch (err: any) {
            const m = String(err?.message || '').toLowerCase();
            if (m.includes('email not confirmed')) setMsg('Debes confirmar tu correo. Revisa tu bandeja.');
            else if (m.includes('invalid')) setMsg('Credenciales inválidas.');
            else setMsg(err?.message || 'Error al iniciar sesión.');
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoading && studentId && password) await handleLogin();
    };

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
                        <h2 className="text-2xl text-center font-extrabold">Colegio Central de Nicaragua BlueWeb</h2>
                        <p className="max-w-sm text-center text-xs/5 opacity-90">
                            Ingresa con tu identificador y contraseña.
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
                        <h2 className="text-3xl text-center font-extrabold">Colegio Central de Nicaragua BlueWeb</h2>
                        <p className="mt-2 max-w-xs text-sm opacity-90">
                            Ingresa con tu identificador y contraseña
                        </p>
                    </div>

                    <CardContent className="p-6 sm:p-8">
                        <div className="mx-auto w-full max-w-md">
                            <h1 className="mb-4 text-center text-3xl font-bold sm:text-4xl text-[color:var(--color-text)]">
                                Inicio de sesión
                            </h1>

                            <form onSubmit={onSubmit} className="space-y-5 text-[color:var(--color-text)]">
                                <div>
                                    <label htmlFor="studentId" className="mb-2 block text-sm font-medium opacity-90">Carnet</label>
                                    <Input
                                        id="studentId"
                                        value={studentId}
                                        onChange={(e) => setStudentId(e.target.value)}
                                        placeholder="Ej: 2025001"
                                        inputMode="numeric"
                                        autoComplete="username"
                                        autoFocus
                                        className="w-full rounded-xl border px-4 py-3
                               border-[var(--color-border)] bg-[color:var(--color-surface)]
                               text-[color:var(--color-text)] placeholder:text-slate-400
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="mb-2 block text-sm font-medium opacity-90">Contraseña</label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="********"
                                            autoComplete="current-password"
                                            className="w-full rounded-xl border px-4 py-3 pr-12
                                 border-[var(--color-border)] bg-[color:var(--color-surface)]
                                 text-[color:var(--color-text)] placeholder:text-slate-400
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                                        />
                                        <button
                                            type="button"
                                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                            aria-pressed={showPassword}
                                            onClick={() => setShowPassword((s) => !s)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1
                                 text-[color:var(--color-text)]/70 hover:bg-black/5 dark:hover:bg-white/10"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isLoading || !studentId || !password}
                                    className="w-full"
                                    size="lg"
                                    variant="primary"
                                >
                                    {isLoading ? 'Ingresando…' : 'Ingresar'}
                                </Button>

                                {msg && (
                                    <p role="alert" className="mt-2 text-center text-sm text-red-600 dark:text-red-400">{msg}</p>
                                )}

                                <p className="mt-2 text-center text-xs text-[color:var(--color-text)]/70">
                                    Si es tu primer acceso, escribe tu carnet y la contraseña temporal. Te enviaremos un código para activar tu cuenta.
                                </p>
                            </form>
                        </div>
                    </CardContent>
                </div>
            </Card>
        </div>
    );
}