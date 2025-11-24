import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/core/api/supabaseClient";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ journals: 0, sessions: 0, mailbox: 0 });
  const [recentJournals, setRecentJournals] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [recentMailbox, setRecentMailbox] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      try {
        const { data: prof, error: pErr } = await supabase
          .from("profiles")
          .select("id, first_names, last_names, email, role_id, institution_id, created_at, avatar_url, auth_user_id, is_disabled")
          .eq("id", id)
          .maybeSingle();
        if (pErr) throw pErr;
        if (!mounted) return;
        setProfile(prof ?? null);

        // counts
        const [{ count: jCount }, { count: sCount }, { count: mCount }] = await Promise.all([
          supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("profile_id", id),
          supabase.from("survey_sessions").select("id", { count: "exact", head: true }).eq("profile_id", id),
          supabase.from("mailbox").select("id", { count: "exact", head: true }).eq("author_profile_id", id),
        ]).then((r: any) => r.map((x: any) => ({ count: x.count })));

        if (!mounted) return;
        setCounts({ journals: jCount ?? 0, sessions: sCount ?? 0, mailbox: mCount ?? 0 });

        // recent lists (small previews)
        const [{ data: journals }, { data: sessions }, { data: mailbox }] = await Promise.all([
          supabase.from("journal_entries").select("id, type, entry_date, status, title, created_at").eq("profile_id", id).order("created_at", { ascending: false }).limit(5),
          supabase.from("survey_sessions").select("id, assignment_id, started_at, status").eq("profile_id", id).order("started_at", { ascending: false }).limit(5),
          supabase.from("mailbox").select("id, subject, created_at, category").eq("author_profile_id", id).order("created_at", { ascending: false }).limit(5),
        ]);
        if (!mounted) return;
        setRecentJournals(journals ?? []);
        setRecentSessions(sessions ?? []);
        setRecentMailbox(mailbox ?? []);
      } catch (err) {
        console.error("admin user detail error", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!profile) return <div className="p-6">Usuario no encontrado. <button onClick={() => navigate(-1)} className="ml-2 underline">Volver</button></div>;

  return (
    <section className="max-w-4xl mx-auto p-6">
      <button onClick={() => navigate(-1)} className="text-sm text-primary underline mb-4">← Volver</button>
      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16">
          {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={`${profile.first_names} ${profile.last_names}`} /> : <AvatarFallback>{(profile.first_names ?? "")[0] || (profile.last_names ?? "")[0] || "U"}</AvatarFallback>}
        </Avatar>
        <div>
          <h2 className="text-xl font-semibold">{[profile.first_names, profile.last_names].filter(Boolean).join(" ") || "—"}</h2>
          <div className="text-sm text-text/60">{profile.email}</div>
          <div className="text-sm text-text/60">Rol: {profile.role_id === 1 ? 'Admin' : profile.role_id === 2 ? 'Teacher' : 'Student'}</div>
        </div>
        <div className="ml-auto text-sm text-text/60">Creado: {profile.created_at ? new Date(profile.created_at).toLocaleString() : '—'}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-white p-4">
          <div className="text-sm text-text/60">Diarios</div>
          <div className="text-lg font-semibold">{counts.journals}</div>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <div className="text-sm text-text/60">Sesiones / Asignaciones</div>
          <div className="text-lg font-semibold">{counts.sessions}</div>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <div className="text-sm text-text/60">Buzón</div>
          <div className="text-lg font-semibold">{counts.mailbox}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 md:col-span-1 rounded-lg border border-border bg-white p-4">
          <h3 className="font-medium mb-2">Diarios recientes</h3>
          {recentJournals.length === 0 ? <div className="text-sm text-text/60">—</div> : (
            <ul className="space-y-2 text-sm">
              {recentJournals.map(j => (
                <li key={j.id} className="flex items-center justify-between">
                  <div>{j.title ?? j.type ?? 'Diario'} <div className="text-xs text-text/60">{j.entry_date ?? new Date(j.created_at).toLocaleString()}</div></div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="col-span-1 md:col-span-1 rounded-lg border border-border bg-white p-4">
          <h3 className="font-medium mb-2">Sesiones recientes</h3>
          {recentSessions.length === 0 ? <div className="text-sm text-text/60">—</div> : (
            <ul className="space-y-2 text-sm">
              {recentSessions.map(s => (
                <li key={s.id}>{s.assignment_id ? `Asignación ${s.assignment_id}` : s.id} <div className="text-xs text-text/60">{s.started_at}</div></li>
              ))}
            </ul>
          )}
        </div>

        <div className="col-span-1 md:col-span-1 rounded-lg border border-border bg-white p-4">
          <h3 className="font-medium mb-2">Buzón</h3>
          {recentMailbox.length === 0 ? <div className="text-sm text-text/60">—</div> : (
            <ul className="space-y-2 text-sm">
              {recentMailbox.map(m => (
                <li key={m.id}>{m.subject} <div className="text-xs text-text/60">{m.created_at}</div></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
