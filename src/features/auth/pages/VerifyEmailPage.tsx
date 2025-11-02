// VerifyEmailPage.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/core/api/supabaseClient";
import logo from "@/assets/logo.png";

export default function VerifyEmailPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Si el usuario ya confirmó su correo y tiene sesión activa
      if (session && session.user?.email_confirmed_at) {
        navigate("/login", { replace: true });
      }
    };

    // Comprobamos una vez al cargar la página
    checkSession();

    // También podemos escuchar si Supabase detecta un cambio en la sesión (por ejemplo, cuando el usuario confirma su correo)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.user?.email_confirmed_at) {
        navigate("/login", { replace: true });
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
      <img src={logo} alt="Correo enviado" className="w-40 mb-6" />
      <h1 className="text-2xl font-bold mb-2">Correo de verificación enviado</h1>
      <p className="text-gray-500 max-w-md">
        Te hemos enviado un enlace para verificar tu dirección de correo. 
        Revisa tu bandeja de entrada o carpeta de spam.
      </p>
      <button
        onClick={() => navigate("/")}
        className="mt-8 bg-blue-600 text-white px-4 py-2 rounded-xl"
      >
        Volver al inicio
      </button>
    </div>
  );
}

