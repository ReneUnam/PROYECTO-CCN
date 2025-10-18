// src/features/auth/api/authApi.ts
import { supabase } from '@/core/api/supabaseClient';

interface SignUpParams {
    studentId: string;
    email: string;
    password: string;
}

// Función de registro
export const signUp = async ({ studentId, email, password }: SignUpParams) => {
    // 1️⃣ Normalizar inputs
    const normalizedStudentId = studentId.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedStudentId || !normalizedEmail || !normalizedPassword) {
        throw new Error('Todos los campos son obligatorios');
    }

    // 2️⃣ Verificar que el ID esté en allowed_users y no haya sido usado
    const { data: allowedUser, error: allowedError } = await supabase
        .from('allowed_users')
        .select('*')
        .eq('student_id', normalizedStudentId)
        .single();

    if (allowedError) throw new Error('ID no encontrado o no autorizado');
    if (!allowedUser) throw new Error('ID no encontrado');
    if (allowedUser.used) throw new Error('Este ID ya fue registrado');

    // 3️⃣ Crear usuario en Auth **solo con email y password**
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
    });

    if (authError) throw new Error(authError.message);

    const userId = authData.user?.id;
    if (!userId) throw new Error('Error al crear usuario');

    // 4️⃣ Crear perfil vinculado
    const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        full_name: allowedUser.full_name,
        role: allowedUser.role, // student o teacher
        student_id: normalizedStudentId,
    });

    if (profileError) throw new Error(profileError.message);

    // 5️⃣ Marcar ID como usado y guardar correo para recuperación
    const { error: updateError } = await supabase
        .from('allowed_users')
        .update({ used: true, email: normalizedEmail })
        .eq('student_id', normalizedStudentId);

    if (updateError) throw new Error(updateError.message);

    return { userId };
};
