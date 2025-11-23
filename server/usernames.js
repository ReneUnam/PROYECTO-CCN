import express from 'express';
import { supabaseAdmin } from './supabase.js';

const router = express.Router();

// GET /api/usernames?ids=...
router.get('/api/usernames', async (req, res) => {
  const ids = (req.query.ids || '').split(',').map(id => id.trim()).filter(Boolean);
  console.log('[usernames] IDs recibidos:', ids);
  if (!ids.length) return res.json({});
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, first_names, last_names')
      .in('id', ids);
    if (error) throw error;
    console.log('[usernames] Datos obtenidos:', data);
    const result = {};
    for (const id of ids) {
      const row = (data || []).find(r => r.id === id);
      if (row) {
        const name = `${row.first_names || ''} ${row.last_names || ''}`.trim();
        result[id] = name || id;
      } else {
        result[id] = id; // Si no se encuentra, devolver el id
      }
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Error obteniendo nombres' });
  }
});

export default router;
