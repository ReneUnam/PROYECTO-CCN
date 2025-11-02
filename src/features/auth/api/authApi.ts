import { supabase } from '@/core/api/supabaseClient';

interface TempLoginParams {
    studentId: string;
    tempPassword: string;
}

// Verifica las credenciales temporales en profiles
export const verifyTempCredentials = async ({ studentId, tempPassword }: TempLoginParams) => {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('institution_id', studentId)
        .single();

    if (error || !profile) throw new Error('ID no encontrado');
    if (profile.password_temp !== tempPassword) throw new Error('Contraseña temporal incorrecta');

    return profile;
};

// Crea usuario en Supabase Auth y actualiza is_registered
export const registerAuthFromTemp = async (profile: any) => {
  if (profile.is_registered) throw new Error('Usuario ya registrado');

  const emailRedirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/confirm-email`
      : undefined;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: profile.email,
    password: profile.password_temp, // usamos la temporal como contraseña inicial
    options: { emailRedirectTo },
  });

  if (authError) throw new Error(authError.message);
  return authData.user;
};

// Login normal
interface SignInParams {
    studentId: string;
    password: string;
}

export const signIn = async ({ studentId, password }: SignInParams) => {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('email, is_registered')
        .eq('institution_id', studentId)
        .single();

    if (error || !profile) throw new Error('ID no encontrado');

    if (!profile.is_registered) throw new Error('Usuario no registrado en Auth');

    const { error: loginError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
    });

    if (loginError) throw new Error(loginError.message || 'Error al iniciar sesión');

    return { success: true };
};
