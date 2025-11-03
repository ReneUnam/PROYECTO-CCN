import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/core/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { markProfileAsRegisteredByEmail } from '@/features/auth/api/authApi';
import { CheckCircle2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation() as any;

  // Persistir email si viene por state o query (?email=)
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const qsEmail = qs.get('email');
    const stEmail = location?.state?.email as string | undefined;
    const email = stEmail ?? qsEmail ?? sessionStorage.getItem('pendingEmail') ?? '';
    if (email) sessionStorage.setItem('pendingEmail', email);
  }, [location.search, location.state]);

  const email = useMemo(
    () => sessionStorage.getItem('pendingEmail') ?? '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.key]
  );

  const maskedEmail = useMemo(() => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    const head = name.slice(0, 2);
    const tail = name.slice(-1);
    return `${head}${'*'.repeat(Math.max(1, name.length - 3))}${tail}@${domain}`;
  }, [email]);

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [step, setStep] = useState<'enter' | 'verified'>('enter');
  const [msg, setMsg] = useState<{ kind: 'info' | 'error' | 'ok'; text: string } | null>(null);

  const refs = Array.from({ length: 6 }).map(() => useRef<HTMLInputElement>(null));

  useEffect(() => {
    refs[0].current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let t: number | undefined;
    if (cooldown > 0) t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function onChangeDigit(index: number, val: string) {
    const v = val.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    if (v && index < refs.length - 1) refs[index + 1].current?.focus();
  }

  function onKeyDownDigit(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const s = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!s) return;
    e.preventDefault();
    const arr = s.split('');
    const next = [...digits];
    for (let i = 0; i < 6; i++) next[i] = arr[i] ?? '';
    setDigits(next);
    const lastFilled = Math.min(s.length, 6) - 1;
    refs[Math.max(0, lastFilled)].current?.focus();
  }

   async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const code = digits.join('');
      if (code.length !== 6) throw new Error('Ingresa el código completo.');
      if (!email) throw new Error('No se encontró el correo asociado. Vuelve a iniciar desde el login.');

      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
      if (error) throw error;

      // Vincula y marca registrado (una sola vez)
      await supabase.rpc('link_my_profile').match(() => {});
      await supabase.rpc('mark_my_profile_registered').match(() => {});
      await markProfileAsRegisteredByEmail(email).catch(() => {}); // opcional si lo usas en otros flujos

      setStep('verified');
      setMsg({ kind: 'ok', text: 'Correo verificado.' });
    } catch (err: any) {
      setMsg({ kind: 'error', text: err?.message || 'Código inválido.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      if (!email) return setMsg({ kind: 'error', text: 'No hay correo asociado a la verificación.' });
      setCooldown(30);
      setMsg({ kind: 'info', text: 'Código reenviado. Revisa tu correo.' });
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
    } catch (e: any) {
      setMsg({ kind: 'error', text: e?.message || 'No se pudo reenviar el código.' });
      setCooldown(0);
    }
  }


  if (step === 'verified') {
    return (
      <div className="min-h-dvh bg-surface text-text grid place-items-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-surface border border-border shadow-xl p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-emerald-600">
            <CheckCircle2 className="h-12 w-12" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold">¡Correo verificado!</h1>
          <p className="mt-2 text-sm">Tu cuenta fue activada correctamente.</p>
          <Button className="mt-6 w-full" onClick={() => navigate('/dashboard')}>
            Ir al dashboard
          </Button>
          <button className="mt-3 w-full text-sm text-muted-foreground hover:underline" onClick={() => navigate('/login')}>
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[linear-gradient(135deg,#2647a7_0%,#2f66d0_100%)] text-white p-6">
          <div className="flex items-center gap-3">
            <img
              src="https://wvwdhnmsxxzvhszwdivj.supabase.co/storage/v1/object/public/public-assets/logo_blueweb.png"
              alt="Colegio Central de Nicaragua"
              className="h-10 w-10 rounded-xl bg-white p-1 shadow-sm ring-1 ring-white/70" // badge blanco para contraste
            />
            <div>
              <h2 className="text-lg font-semibold">Verificar correo</h2>
              <p className="text-xs text-white/80">Ingresa el código enviado a tu email</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleVerify} className="p-6">
          {email && (
            <p className="mb-4 text-sm text-slate-600">
              Enviamos un código a: <span className="font-medium text-slate-800">{maskedEmail}</span>
            </p>
          )}

          <div className="flex justify-between gap-2">
            {digits.map((d, i) => (
              <Input
                key={i}
                ref={refs[i]}
                value={d}
                onChange={(e) => onChangeDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDownDigit(i, e)}
                onPaste={onPaste}
                inputMode="numeric"
                maxLength={1}
                className="h-12 w-12 text-center text-lg font-semibold tracking-widest rounded-xl border-slate-300 focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-emerald-600" // foco al verde
              />
            ))}
          </div>

          {msg && (
            <div
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${msg.kind === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : msg.kind === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-sky-200 bg-sky-50 text-sky-700'
                }`}
            >
              {msg.text}
            </div>
          )}

          <Button type="submit" disabled={loading} className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-600">
            {loading ? 'Verificando…' : 'Verificar código'}
          </Button>

          <div className="mt-3 flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={cooldown > 0}
              onClick={handleResend}
              className={`text-emerald-700 hover:underline disabled:text-slate-400`} // enlace acorde al nuevo color
            >
              {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
            </button>
            <button type="button" onClick={() => navigate('/login')} className="text-slate-500 hover:text-slate-700">
              Volver al login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}