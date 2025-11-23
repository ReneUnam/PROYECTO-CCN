import express from 'express';
import { supabaseAdmin } from './supabase.js';

const router = express.Router();

// POST /alerts - recibe alerta de riesgo
router.post('/alerts', async (req, res) => {
  const { userId, score, riskType, timestamp } = req.body;
  if (!userId || !score || !riskType || !timestamp) {
    return res.status(400).json({ error: 'Datos incompletos para alerta' });
  }
  try {
    const { error } = await supabaseAdmin.from('risk_alerts').insert({
      user_id: userId,
      score,
      risk_type: riskType,
      timestamp
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Error guardando alerta' });
  }
});

// GET /alerts - listado de alertas
router.get('/alerts', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('risk_alerts').select('*').order('timestamp', { ascending: false });
    if (error) {
      console.error('[ALERTAS] Supabase error:', error);
      throw error;
    }
    if (!data) {
      console.error('[ALERTAS] No data returned from Supabase');
    }
    res.json({ alerts: data || [] });
  } catch (e) {
    console.error('[ALERTAS] Error en GET /alerts:', e);
    res.status(500).json({ error: e.message || 'Error obteniendo alertas' });
  }
});

export default router;
