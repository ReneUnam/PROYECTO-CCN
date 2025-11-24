import { useEffect, useState } from 'react';
import { supabase } from '@/core/api/supabaseClient';

export type RoleId = 1 | 2 | 3;
export interface UserProfile {
  id: string;
  full_name: string;
  role_id: RoleId;
  first_names?: string | null;
  last_names?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export const useAuth = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadFromSession = async (session: any) => {
      // Solo recargar si la sesión realmente cambió
      const sessionId = session?.user?.id || null;
      if (sessionId === lastSessionId && user !== null) {
        // No hacer nada si la sesión es la misma y ya hay usuario
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const authUser = session?.user ?? null;
        if (!authUser) {
          if (active) setUser(null);
          setLastSessionId(null);
          return;
        }

        // 1) por vínculo
        let { data: profile } = await supabase
          .from('profiles')
          .select('id, first_names, last_names, role_id, email, auth_user_id, avatar_url')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();

        // 2) fallback por email + autovínculo
        if (!profile && authUser.email) {
          const byEmail = await supabase
            .from('profiles')
            .select('id, first_names, last_names, role_id, email, auth_user_id, avatar_url')
            .eq('email', authUser.email)
            .maybeSingle();
          profile = byEmail.data ?? null;

          if (profile && !profile.auth_user_id) {
            await supabase.from('profiles').update({ auth_user_id: authUser.id }).eq('id', profile.id);
            profile.auth_user_id = authUser.id;
          }
        }

        const email = profile?.email ?? authUser.email ?? '';
        const name = `${profile?.first_names ?? ''} ${profile?.last_names ?? ''}`.trim() || (email.split('@')[0] || 'Usuario');

        if (active) {
          setUser(
            profile
              ? {
                  id: profile.id,
                  full_name: name,
                  role_id: (profile.role_id as RoleId) ?? 3,
                  first_names: profile.first_names,
                  last_names: profile.last_names,
                  email,
                  avatar_url: profile.avatar_url ?? null,
                }
              : { id: authUser.id, full_name: name, role_id: 3, email, avatar_url: null }
          );
          setLastSessionId(sessionId);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await loadFromSession(session);
    })();

    // No registrar ningún listener de sesión para evitar refresco molesto
    return () => {
      active = false;
    };
  }, []);

  return { user, loading };
};