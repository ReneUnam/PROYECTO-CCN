
-- Example usage (run in Supabase SQL editor):
CREATE OR REPLACE FUNCTION public.profile_summary(p_profile_text text DEFAULT NULL)
RETURNS TABLE(
  profile_id uuid,
  wellbeing_avg numeric,
  energy_avg numeric,
  sleep_count integer,
  activity_count integer
) AS $$
DECLARE
  profile_uuid uuid := NULL;
  cutoff_14 timestamp := (current_date - INTERVAL '14 days');
  cutoff_90 timestamp := (current_date - INTERVAL '90 days');
BEGIN
  PERFORM set_config('search_path', 'public', true);

  IF p_profile_text IS NOT NULL THEN
    BEGIN
      profile_uuid := p_profile_text::uuid;
    EXCEPTION WHEN others THEN
      profile_uuid := NULL;
    END;
  END IF;

  IF profile_uuid IS NULL THEN
    RETURN; -- no valid profile id provided
  END IF;

  RETURN QUERY
  SELECT
    profile_uuid AS profile_id,
    -- wellbeing_avg: try labelled wellbeing prompts, then per-entry, per-answer, 90d, and all-time
    COALESCE(
      -- 1) labelled wellbeing prompts per-entry (last 14 days)
      (
        SELECT round(avg(entry_avg)::numeric, 1) FROM (
          SELECT je.id, avg(a.scale_value::numeric) AS entry_avg
          FROM journal_entries je
          JOIN journal_answers a ON a.entry_id = je.id
          JOIN journal_items i ON a.item_id = i.id
          WHERE je.profile_id = profile_uuid
            AND je.type = 'emotions'
            AND je.entry_date >= cutoff_14
            AND a.scale_value IS NOT NULL
            AND (lower(i.prompt) LIKE '%bienestar%' OR lower(i.prompt) LIKE '%wellbeing%')
          GROUP BY je.id
        ) t
      ),
      -- 2) any per-entry avg for emotions (last 14 days)
      (
        SELECT round(avg(entry_avg)::numeric, 1) FROM (
          SELECT je.id, avg(a.scale_value::numeric) AS entry_avg
          FROM journal_entries je
          JOIN journal_answers a ON a.entry_id = je.id
          WHERE je.profile_id = profile_uuid
            AND je.type = 'emotions'
            AND je.entry_date >= cutoff_14
            AND a.scale_value IS NOT NULL
          GROUP BY je.id
        ) t2
      ),
      -- 3) per-answer avg (last 14 days)
      (
        SELECT round(avg(a.scale_value::numeric), 1)
        FROM journal_answers a
        JOIN journal_entries je ON a.entry_id = je.id
        WHERE je.profile_id = profile_uuid
          AND je.type = 'emotions'
          AND je.entry_date >= cutoff_14
          AND a.scale_value IS NOT NULL
      ),
      -- 4) per-entry avg (last 90 days)
      (
        SELECT round(avg(entry_avg)::numeric, 1) FROM (
          SELECT je.id, avg(a.scale_value::numeric) AS entry_avg
          FROM journal_entries je
          JOIN journal_answers a ON a.entry_id = je.id
          WHERE je.profile_id = profile_uuid
            AND je.type = 'emotions'
            AND je.entry_date >= cutoff_90
            AND a.scale_value IS NOT NULL
          GROUP BY je.id
        ) t4
      ),
      -- 5) per-answer avg (all time)
      (
        SELECT round(avg(a.scale_value::numeric), 1)
        FROM journal_answers a
        JOIN journal_entries je ON a.entry_id = je.id
        WHERE je.profile_id = profile_uuid
          AND je.type = 'emotions'
          AND a.scale_value IS NOT NULL
      )
    ) AS wellbeing_avg,

    -- energy_avg: try labelled energy prompts in self-care, then generic self-care averages
    COALESCE(
      (
        SELECT round(avg(entry_avg)::numeric, 1) FROM (
          SELECT je.id, avg(a.scale_value::numeric) AS entry_avg
          FROM journal_entries je
          JOIN journal_answers a ON a.entry_id = je.id
          JOIN journal_items i ON a.item_id = i.id
          WHERE je.profile_id = profile_uuid
            AND je.type = 'self-care'
            AND je.entry_date >= cutoff_14
            AND a.scale_value IS NOT NULL
            AND (lower(i.prompt) LIKE '%energ%' OR lower(i.prompt) LIKE '%energy%')
          GROUP BY je.id
        ) t_e1
      ),
      (
        SELECT round(avg(entry_avg)::numeric, 1) FROM (
          SELECT je.id, avg(a.scale_value::numeric) AS entry_avg
          FROM journal_entries je
          JOIN journal_answers a ON a.entry_id = je.id
          WHERE je.profile_id = profile_uuid
            AND je.type = 'self-care'
            AND je.entry_date >= cutoff_14
            AND a.scale_value IS NOT NULL
          GROUP BY je.id
        ) t_e2
      ),
      (
        SELECT round(avg(a.scale_value::numeric), 1)
        FROM journal_answers a
        JOIN journal_entries je ON a.entry_id = je.id
        WHERE je.profile_id = profile_uuid
          AND je.type = 'self-care'
          AND je.entry_date >= cutoff_14
          AND a.scale_value IS NOT NULL
      ),
      -- fallbacks: 90 days per-entry then all-time per-answer
      (
        SELECT round(avg(entry_avg)::numeric, 1) FROM (
          SELECT je.id, avg(a.scale_value::numeric) AS entry_avg
          FROM journal_entries je
          JOIN journal_answers a ON a.entry_id = je.id
          WHERE je.profile_id = profile_uuid
            AND je.type = 'self-care'
            AND je.entry_date >= cutoff_90
            AND a.scale_value IS NOT NULL
          GROUP BY je.id
        ) t_e3
      ),
      (
        SELECT round(avg(a.scale_value::numeric), 1)
        FROM journal_answers a
        JOIN journal_entries je ON a.entry_id = je.id
        WHERE je.profile_id = profile_uuid
          AND je.type = 'self-care'
          AND a.scale_value IS NOT NULL
      )
    ) AS energy_avg,

    -- sleep_count: count distinct self-care entries in last 14 days with sleep-like prompts and scale >= 4
    (
      SELECT coalesce(count(DISTINCT je.id), 0)::integer
      FROM journal_entries je
      JOIN journal_answers a ON a.entry_id = je.id
      JOIN journal_items i ON a.item_id = i.id
      WHERE je.profile_id = profile_uuid
        AND je.type = 'self-care'
        AND je.entry_date >= cutoff_14
        AND a.scale_value IS NOT NULL
        AND (
          lower(i.prompt) LIKE '%sue%' OR lower(i.prompt) LIKE '%dorm%' OR lower(i.prompt) LIKE '%sleep%'
        )
        AND a.scale_value::numeric >= 4
    ) AS sleep_count,

    -- activity_count: sum of activity scale values in last 14 days
    (
      SELECT coalesce(sum(a.scale_value::integer), 0)::integer
      FROM journal_answers a
      JOIN journal_items i ON a.item_id = i.id
      JOIN journal_entries je ON a.entry_id = je.id
      WHERE je.profile_id = profile_uuid
        AND je.type = 'self-care'
        AND je.entry_date >= cutoff_14
        AND a.scale_value IS NOT NULL
        AND (
          lower(i.prompt) LIKE '%activ%' OR lower(i.prompt) LIKE '%ejerc%' OR lower(i.prompt) LIKE '%activity%'
        )
    ) AS activity_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
