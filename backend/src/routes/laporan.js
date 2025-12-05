const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');


// Laporan harian summary
router.get('/harian', authMiddleware(true), async (req, res) => {
const { date } = req.query; // expect YYYY-MM-DD
const from = date ? `${date}T00:00:00Z` : new Date().toISOString().slice(0,10) + 'T00:00:00Z';
const to = date ? `${date}T23:59:59Z` : new Date().toISOString().slice(0,10) + 'T23:59:59Z';
const { data, error } = await supabase.rpc('laporan_harian', { p_from: from, p_to: to }).catch(()=>({ data: null, error: null }));
if (error) return res.status(500).json({ error });
res.json({ data });
});


module.exports = router;