import { supabase } from '@/core/api/supabaseClient';

// interface TempLoginParams {
//     studentId: string;
//     tempPassword: string;
// }

// Verifica las credenciales temporales en profiles
export async function verifyTempCredentials(params: { studentId: string; tempPassword: string }) {
  const { studentId, tempPassword } = params;
  const { data, error } = await supabase.rpc('login_verify_temp_by_student', {
    p_student_id: studentId.trim(),
    p_temp_password: tempPassword.trim(),
  });
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Carnet o contraseña temporal inválidos.');
  }
  const row = data[0];
  return {
    email: row.email as string,
    is_registered: !!row.is_registered,
    role_id: Number(row.role_id) || 3,
  };
}

// Enviar correo con OTP (sin redirect)
export async function registerAuthFromTemp(params: { email: string; tempPassword: string }) {
  const { email, tempPassword } = params;
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password: tempPassword.trim(),
    options: { emailRedirectTo: `${window.location.origin}/auth/verify-email?email=${encodeURIComponent(email.trim())}` },
  });
  if (error) throw error;
}

// Login normal
// interface SignInParams {
//     studentId: string;
//     password: string;
// }


export async function signIn(params: { studentId?: string; email?: string; password: string }) {
  const { studentId, email, password } = params;

  let loginEmail = email?.trim();
  if (!loginEmail) {
    const { data, error } = await supabase.rpc('login_get_email_by_student', {
      p_student_id: String(studentId ?? '').trim(),
    });
    if (error) throw error;
    if (!data) throw new Error('No existe un usuario con ese carnet.');
    loginEmail = data as string;
  }

  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: loginEmail!,
    password: password.trim(),
  });
  if (signErr) throw signErr;
}

// Marcar perfil como registrado (no limpia password_temp)
export async function markProfileAsRegisteredByEmail(email: string) {
  // preferimos usar la RPC server-side ya que la sesión existe tras verifyOtp
  await supabase.rpc('mark_my_profile_registered').match(() => {});
  await supabase.rpc('link_my_profile').match(() => {});
}
