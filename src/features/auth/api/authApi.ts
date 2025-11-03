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

// Enviar correo con OTP (sin redirect)
export const registerAuthFromTemp = async (profile: any) => {
  if (profile.is_registered) throw new Error('Usuario ya registrado');

  const { data, error } = await supabase.auth.signUp({
    email: profile.email,
    password: profile.password_temp, // temporal como inicial
  });

  if (error) throw new Error(error.message);
  return data.user;
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

// Marcar perfil como registrado (no limpia password_temp)
export const markProfileAsRegisteredByEmail = async (email: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_registered: true })
    .eq('email', email);
  if (error) throw new Error('No se pudo actualizar el perfil.');
};
