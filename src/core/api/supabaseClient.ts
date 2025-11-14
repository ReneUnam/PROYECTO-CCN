import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// console.log("URL de Supabase:", supabaseUrl);
// console.log("Clave Anon de Supabase:", supabaseAnonKey);

// export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage },
  }
);

// Solo para depuración en desarrollo
if (import.meta.env.DEV) {
  // @ts-expect-error debug global
  window.supabase = supabase;
}