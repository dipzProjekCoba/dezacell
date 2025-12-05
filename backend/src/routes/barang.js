const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');


// List barang (with optional search)
router.get('/', authMiddleware(false), async (req, res) => {
const { q, kategori, limit = 50, offset = 0 } = req.query;
let query = supabase.from('barang').select('*').order('id', { ascending: true }).range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
if (q) query = query.ilike('nama', `%${q}%`);
if (kategori) query = query.eq('id_kategori', kategori);
const { data, error } = await query;
if (error) return res.status(500).json({ error });
res.json(data);
});


// Create barang
router.post('/', authMiddleware(true), async (req, res) => {
const payload = req.body;
// Expect payload: kode_barang, nama, id_kategori, merek, tipe, kondisi, harga_beli, harga_jual, stok, stok_min, deskripsi
const { data, error } = await supabase.from('barang').insert([payload]).select().single();
if (error) return res.status(500).json({ error });
res.json(data);
});


// Update barang
router.put('/:id', authMiddleware(true), async (req, res) => {
const id = req.params.id;
const payload = req.body;
const { data, error } = await supabase.from('barang').update(payload).eq('id', id).select().single();
if (error) return res.status(500).json({ error });
res.json(data);
});


// Delete barang
router.delete('/:id', authMiddleware(true), async (req, res) => {
const id = req.params.id;
const { error } = await supabase.from('barang').delete().eq('id', id);
if (error) return res.status(500).json({ error });
res.json({ message: 'Deleted' });
});


module.exports = router;