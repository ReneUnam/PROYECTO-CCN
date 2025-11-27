import { useEffect, useState } from "react";
import { supabase } from "@/core/api/supabaseClient";
import { getStreak, getEntryAnswers } from "@/features/journal/api/journalApi";
import { getMyAssignments } from "@/features/questions/api/assignmentsApi";

export type ProfileSummary = {
  loading: boolean;
  wellbeing?: number | null;
  lastUpdate?: string | null;
  emotions?: { name: string; count: number; pct: number; emoji?: string | null }[];
  streakEmo?: number;
  streakSelf?: number;
  pendingAssignments?: number;
  answeredToday?: number;
  hasJournalToday?: boolean;
  // Autocuidado
  energyAvg?: number | null;
  energyLabel?: string | null;
  sleepCount?: number;
  activityCount?: number;
  // Wellbeing average over the last 14 days, 1..5 scale
  wellbeingAvg?: number | null;
};

export function useProfileSummary() {
  const [state, setState] = useState<ProfileSummary>({ loading: true });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const authUid = auth?.user?.id;
        if (!authUid) {
          if (mounted) setState({ loading: false });
          return;
        }

        // Primero obtener el id de perfil asociado al usuario autenticado
        const { data: profileData, error: profileErr } = await supabase.from("profiles").select("id").eq("auth_user_id", authUid).maybeSingle();
        if (profileErr) throw profileErr;
        const profileId = profileData?.id;
        if (!profileId) {
          if (mounted) setState({ loading: false });
          return;
        }
        if (import.meta.env.DEV) console.debug('profileSummary: authUid', authUid, 'profileId', profileId);

        // Use safe selects and split entries by type to avoid accidental 400s and mix of data
        // Use entry_date (YYYY-MM-DD) to avoid timezone issues; Postgres date comparison prefers date string
        const dateFrom = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const { data: lastEntryData, error: lastEntryErr } = await supabase
          .from("journal_entries")
          .select("id, created_at, entry_date, status, completed_at, type")
          .eq("profile_id", profileId)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1);
        if (import.meta.env.DEV) console.debug('profileSummary: lastEntryErr', lastEntryErr);

        const [entriesEmoRes, entriesSelfRes] = await Promise.all([
          supabase
            .from("journal_entries")
            .select("id, created_at, entry_date, status, completed_at, type")
            .eq("profile_id", profileId)
            .eq("status", "completed")
            .eq("type", "emotions")
              .gte("entry_date", dateFrom)
            .order("created_at", { ascending: false })
            .limit(200),
          supabase
            .from("journal_entries")
            .select("id, created_at, entry_date, status, completed_at, type")
            .eq("profile_id", profileId)
            .eq("status", "completed")
            .eq("type", "self-care")
            .gte("entry_date", dateFrom)
            .order("created_at", { ascending: false })
            .limit(200),
        ] as any);
        if (import.meta.env.DEV) console.debug('profileSummary: entriesEmoRes.err', entriesEmoRes?.error, 'entriesEmoRes.count', entriesEmoRes?.data?.length, 'entriesSelfRes.err', entriesSelfRes?.error, 'entriesSelfRes.count', entriesSelfRes?.data?.length);
        if (import.meta.env.DEV) {
          try {
            const { data: allEntries, error: allErr } = await supabase
              .from("journal_entries")
              .select("id, entry_date, type, status")
              .eq("profile_id", profileId)
              .order("entry_date", { ascending: false })
              .limit(200);
            console.debug('profileSummary: allEntries.err', allErr, 'allEntries.count', allEntries?.length, 'allEntries.sample', (allEntries || []).slice(0, 5));
          } catch {
            // ignore
          }
        }

        const [assignments, streakE, streakS, answered] = await Promise.all([
          getMyAssignments(),
          getStreak("emotions").catch(() => ({ current_streak: 0 })),
          getStreak("self-care").catch(() => ({ current_streak: 0 })),
          (async () => {
            try {
              return await supabase.rpc("my_answered_questions_today");
            } catch {
              return { data: 0 };
            }
          })(),
        ] as any);

        // Optionally use a server-side summary RPC if available (faster & consistent)
        let rpcSummary: any = null;
        try {
          const { data: rpcData, error: rpcErr } = await supabase.rpc('profile_summary', { p_profile_text: profileId });
          if (import.meta.env.DEV) console.debug('profileSummary: rpcErr', rpcErr, 'rpcData', rpcData);
          if (rpcErr) {
            console.warn('profileSummary RPC error', rpcErr);
            // avoid breaking the UI — we'll fall back to client-side aggregation
          }
          if (!rpcErr) {
            // PostgREST usually returns an array of rows for table-returning functions
            if (Array.isArray(rpcData) && rpcData.length > 0) rpcSummary = rpcData[0];
            else if (rpcData && typeof rpcData === 'object') rpcSummary = rpcData;
            else rpcSummary = null;
          }
        } catch (e) {
          if (import.meta.env.DEV) console.debug('profileSummary: rpc thrown', e);
          rpcSummary = null;
        }

        if (!mounted) return;

        const lastEntry = (lastEntryData && lastEntryData[0]) || null;
        const entriesEmo = (entriesEmoRes && entriesEmoRes.data) || [];
        const entriesSelf = (entriesSelfRes && entriesSelfRes.data) || [];

        // wellbeing value (we'll try to compute from lastEntry answers below)
        const wellbeing = null as number | null;
        const lastUpdate = lastEntry?.created_at ?? null;

        // emotions aggregation
        const counts = new Map<string, number>();
        const emojiMap = new Map<string, string | null>();
        // Autocuidado accumulators
        const energyValues: number[] = [];
        let sleepCount = 0;
        let activityCount = 0;
        // wellbeing accumulators
        const wellbeingValues: number[] = [];
        const wellbeingByEntry = new Map<string, number[]>();

        // Try to aggregate answers for emotion entries and self-care entries separately
        let answerRowsEmo: any[] = [];
        let answerRowsSelf: any[] = [];
        // debug
        if (import.meta.env.DEV) {
          console.debug('profileSummary: entriesEmo count', entriesEmo.length, 'entriesSelf count', entriesSelf.length);
        }
        try {
          const entryIds = entriesEmo.map((x: any) => x.id).filter(Boolean);
          if (entryIds.length) {
            const { data: ansData, error: ansErr } = await supabase
              .from("journal_answers")
              .select("entry_id, item_id, scale_value, options_values, item:journal_items(id, kind, prompt, options, scale_labels)")
              .in("entry_id", entryIds);
              if (!ansErr && Array.isArray(ansData)) answerRowsEmo = ansData;
            if (import.meta.env.DEV) console.debug('profileSummary: fetched journal_answers for emotion entries', answerRowsEmo.length);
          }
        } catch (e) {
          // ignore - we'll fall back to entry-level fields
          answerRowsEmo = [];
        }

        // If direct join query didn't return rows, try fetching per-entry answers via existing API
        if (!answerRowsEmo.length && entriesEmo.length) {
          try {
            const per = await Promise.all(entriesEmo.map((en: any) => getEntryAnswers(en.id).catch(() => [])));
            answerRowsEmo = per.flat();
          } catch {
            // ignore
          }
        }

        // Prefer answers when available (journal_answers with item metadata)
        if (answerRowsEmo.length) {
          for (const a of answerRowsEmo) {
            try {
              const item = a?.item ?? null;
              // parse options_values which may be stored as JSON or array
              let opts: any[] = [];
              if (Array.isArray(a.options_values)) opts = a.options_values;
              else if (typeof a.options_values === 'string') {
                try { opts = JSON.parse(a.options_values); } catch { opts = []; }
              }

              if (opts && opts.length && item) {
                // item.options may be JSON string or array
                let itemOptions: any[] = [];
                if (Array.isArray(item.options)) itemOptions = item.options;
                else if (typeof item.options === 'string') {
                  try { itemOptions = JSON.parse(item.options); } catch { itemOptions = []; }
                }
                for (const key of opts) {
                  const found = itemOptions.find((o: any) => o.key === key || o.id === key || o.value === key) || null;
                  const label = found ? (found.label ?? found.key ?? String(key)) : String(key);
                  const emoji = found ? (found.emoji ?? null) : null;
                  counts.set(label, (counts.get(label) ?? 0) + 1);
                  if (emoji && !emojiMap.has(label)) emojiMap.set(label, emoji);
                }
              }

              // scale answers could represent wellbeing, energy, sleep, activity
              if (typeof a.scale_value === 'number') {
                const prompt = String(item?.prompt ?? '').toLowerCase();
                const sl = a.scale_value;
                // if this looks like a 'wellbeing' prompt, capture for averaging
                if (prompt.includes('bienestar') || prompt.includes('wellbeing') || (item?.key && String(item.key).toLowerCase().includes('wellbeing'))) {
                  // store wellbeing scales grouped by entry id (avoid per-answer overweighting)
                  const entryId = a.entry_id ?? a.entryId ?? null;
                  if (entryId) {
                    if (!wellbeingByEntry.has(entryId)) wellbeingByEntry.set(entryId, []);
                    wellbeingByEntry.get(entryId)?.push(sl);
                  } else {
                    wellbeingValues.push(sl);
                  }
                }
                // heuristics based on prompt text
                if (prompt.includes('energ')) energyValues.push(sl);
                else if (prompt.includes('sue') || prompt.includes('dorm')) {
                  if (sl >= 4) sleepCount += 1; // treat high scale as sufficient sleep
                } else if (prompt.includes('activ') || prompt.includes('ejerc')) {
                  activityCount += Number(sl || 0);
                }
              }
            } catch (err) {
              // ignore row parsing errors
            }
          }
        } else {
          // fallback to entry-level fields
          for (const e of entriesEmo) {
            const name = e?.emotion ?? e?.mood ?? null;
            if (name) counts.set(name, (counts.get(name) ?? 0) + 1);

            // energy candidates
            const possibleEnergy = e?.energy ?? e?.wellbeing ?? e?.wellbeing_score ?? null;
            if (typeof possibleEnergy === 'number' && !Number.isNaN(possibleEnergy)) energyValues.push(possibleEnergy);

            // sleep candidates: boolean flags or numeric hours
            const sleepFlag = e?.sleep_sufficient ?? e?.slept_enough ?? null;
            if (typeof sleepFlag === 'boolean' && sleepFlag) sleepCount += 1;
            else if (typeof e?.sleep === 'number') {
              // consider >=7 hours as 'sufficient'
              if (e.sleep >= 7) sleepCount += 1;
            }

            // activity candidates: numeric counts or boolean
            if (typeof e?.activity_count === 'number') activityCount += Number(e.activity_count || 0);
            else if (typeof e?.exercise === 'number') activityCount += Number(e.exercise || 0);
            else if (e?.activity === true) activityCount += 1;
            else if (e?.actividad === true) activityCount += 1;
          }
        }
        const total = Array.from(counts.values()).reduce((s, v) => s + v, 0) || 0;
        const emotions = Array.from(counts.entries())
          .map(([name, count]) => ({ name, count, pct: total ? Math.round((count / total) * 100) : 0, emoji: emojiMap.get(name) ?? null }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        const pendingAssignments = Array.isArray(assignments) ? assignments.filter((a: any) => a.completed < a.max_attempts).length : 0;
        const answeredToday = (answered && (answered.data ?? 0)) || 0;

        // For autocuidado, gather answers (self-care entries) and compute energy/sleep/activity
        try {
          const entryIdsSelf = entriesSelf.map((x: any) => x.id).filter(Boolean);
          if (entryIdsSelf.length) {
            const { data: ansDataSelf, error: ansErrSelf } = await supabase
              .from("journal_answers")
              .select("entry_id, item_id, scale_value, options_values, item:journal_items(id, kind, prompt, options, scale_labels)")
              .in("entry_id", entryIdsSelf);
            if (!ansErrSelf && Array.isArray(ansDataSelf)) answerRowsSelf = ansDataSelf;
            if (import.meta.env.DEV) console.debug('profileSummary: fetched journal_answers for self-care entries', answerRowsSelf.length);
          }
        } catch (e) {
          answerRowsSelf = [];
        }
        if (!answerRowsSelf.length && entriesSelf.length) {
          try {
            const perS = await Promise.all(entriesSelf.map((en: any) => getEntryAnswers(en.id).catch(() => [])));
            answerRowsSelf = perS.flat();
          } catch {
            // ignore
          }
        }

        if (answerRowsSelf.length) {
          for (const a of answerRowsSelf) {
            try {
              const item = a?.item ?? null;
              if (typeof a.scale_value === 'number') {
                const prompt = String(item?.prompt ?? '').toLowerCase();
                const sl = a.scale_value;
                if (prompt.includes('energ')) energyValues.push(sl);
                else if (prompt.includes('sue') || prompt.includes('dorm')) {
                  if (sl >= 4) sleepCount += 1;
                } else if (prompt.includes('activ') || prompt.includes('ejerc')) {
                  activityCount += Number(sl || 0);
                }
              }
            } catch (err) { /* ignore */ }
          }
        }

        // compute wellbeing from last completed entry if available
        let maybeWellbeing: number | null = null;
        try {
          if (lastEntry && lastEntry.id) {
            const lastAnswers = await getEntryAnswers(lastEntry.id).catch(() => []);
            for (const a of lastAnswers) {
              const item = a?.item ?? null;
              if (typeof a.scale_value === 'number') {
                const prompt = String(item?.prompt ?? '').toLowerCase();
                if (prompt.includes('bienestar') || prompt.includes('wellbeing') || prompt.includes('en general')) {
                  maybeWellbeing = Number(a.scale_value);
                  break;
                }
              }
            }
          }
        } catch (e) { /* ignore */ }
        const todayStr = new Date().toISOString().slice(0, 10);
        const hasJournalToday = [ ...entriesEmo, ...entriesSelf ].some((e: any) => String(e.entry_date)?.slice(0, 10) === todayStr) || false;

        // compute energy average and label
        const energyAvg = energyValues.length ? energyValues.reduce((s, v) => s + v, 0) / energyValues.length : null;
        // per-entry average first -> reduce per day to avoid overweighting entries with many answers
        let wellbeingAvg: number | null = null;
        if (wellbeingByEntry.size) {
          const arr = Array.from(wellbeingByEntry.values()).map((vals) => vals.reduce((s, v) => s + v, 0) / vals.length);
          wellbeingAvg = arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
        } else if (wellbeingValues.length) {
          wellbeingAvg = wellbeingValues.reduce((s, v) => s + v, 0) / wellbeingValues.length;
        }
        let energyLabel: string | null = null;
        if (energyAvg != null) {
          if (energyAvg >= 4) energyLabel = 'alta';
          else if (energyAvg >= 3) energyLabel = 'media';
          else energyLabel = 'baja';
        }

        setState({
          loading: false,
          // If we got an RPC summary, prefer it for averages and counts
          wellbeing: maybeWellbeing ?? wellbeing,
          energyAvg: rpcSummary?.energy_avg ?? energyAvg,
          wellbeingAvg: rpcSummary?.wellbeing_avg ?? wellbeingAvg,
          sleepCount: rpcSummary?.sleep_count ?? sleepCount,
          activityCount: rpcSummary?.activity_count ?? activityCount,
          lastUpdate,
          emotions,
          streakEmo: streakE?.current_streak ?? 0,
          streakSelf: streakS?.current_streak ?? 0,
          pendingAssignments,
          answeredToday: Number(answeredToday || 0),
          hasJournalToday,
          energyLabel,
        });
      } catch (err) {
        console.error("useProfileSummary error:", err);
        if (mounted) setState({ loading: false });
      }
    })();
    return () => { mounted = false; };
  }, []);

  return state;
}
