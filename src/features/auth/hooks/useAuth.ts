import { useState, useEffect } from 'react';
import { supabase } from '@/core/api/supabaseClient';

export interface UserProfile {
    id: string;
    full_name: string;
    role: 'student' | 'teacher' | 'admin';
}

export const useAuth = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getUserProfile = async () => {
            const session = supabase.auth.getSession();
            if (!session) {
                setUser(null);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', (await session).data.session?.user.id)
                .single();

            if (error) {
                console.error(error);
                setUser(null);
            } else {
                setUser(data);
            }
            setLoading(false);
        };

        getUserProfile();

        // Escucha cambios de sesión
        const { data: listener } = supabase.auth.onAuthStateChange(() => {
            getUserProfile();
        });

        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    return { user, loading };
};
