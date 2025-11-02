import { useEffect, useState } from 'react';
import { supabase } from '@/core/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function ConfirmEmailPage() {
    const [msg, setMsg] = useState('Verificando...');
    const navigate = useNavigate();

    useEffect(() => {
        const verify = async () => {
            try {
                // Intercambia el code del enlace por sesión
                const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
                if (error) throw error;

                // Obtiene el email de la sesión
                const { data } = await supabase.auth.getUser();
                const email = data.user?.email;
                if (email) {
                    // Solo is_registered = true (sin limpiar password_temp)
                    await markProfileAsRegisteredByEmail(email);
                }

                setMsg('¡Correo verificado! Redirigiendo…');
                setTimeout(() => navigate('/login'), 1500);
            } catch (e: any) {
                setMsg(e?.message || 'Error al verificar el correo.');
            }
        };

        verify();
    }, [navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="bg-white p-8 rounded-xl shadow text-center">
                <h2 className="text-2xl font-bold mb-4">Confirmación de correo</h2>
                <p>{msg}</p>
                {msg.startsWith('Error') && (
                    <Button className="mt-4" onClick={() => navigate('/login')}>
                        Volver al login
                    </Button>
                )}
            </div>
        </div>
    );
}
export const markProfileAsRegisteredByEmail = async (email: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_registered: true }) // no borrar password_temp
    .eq('email', email);

  if (error) throw new Error('No se pudo actualizar el perfil tras confirmar el correo.');
};

// export const markProfileAsRegistered = async (email: string) => {
//     const { error } = await supabase
//         .from('profiles')
//         .update({ is_registered: true })
//         .eq('email', email);

//     if (error) throw error;
// };

