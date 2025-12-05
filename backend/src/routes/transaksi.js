const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// Buat transaksi baru
router.post('/', authMiddleware(true), async (req, res) => {
  try {
    const { id_user, items, diskon_nominal, uang_diterima, metode_bayar } = req.body;

    let total_harga = 0;
    let total_barang = 0;

    for (const it of items) {
      total_harga += parseInt(it.qty) * parseInt(it.harga_satuan);
      total_barang += parseInt(it.qty);
    }

    const total_bayar = total_harga - parseInt(diskon_nominal);
    const kembalian = parseInt(uang_diterima) - total_bayar;

    // Generate no_transaksi
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const { data: todayCount } = await supabase
      .rpc('count_transaksi_today', { date_str: datePart })
      .catch(() => ({ data: [{ count: 0 }] }));

    let seq = Math.floor(Math.random() * 900) + 100;
    const no_transaksi = `TRX/${datePart}/${seq}`;

    // Insert transaksi
    const { data: trx } = await supabase
      .from('transaksi')
      .insert([
        {
          no_transaksi,
          id_user,
          total_barang,
          total_harga,
          diskon_nominal,
          total_bayar,
          uang_diterima,
          kembalian,
          metode_bayar,
        },
      ])
      .select()
      .single();

    // Insert detail + update stok
    for (const it of items) {
      const id_barang = it.id_barang;
      const qty = parseInt(it.qty);
      const harga_satuan = parseInt(it.harga_satuan);
      const subtotal = qty * harga_satuan;

      await supabase
        .from('transaksi_detail')
        .insert([{ id_transaksi: trx.id, id_barang, qty, harga_satuan, subtotal }]);

      await supabase.rpc('decrement_stok', { p_id_barang: id_barang, p_qty: qty }).catch(() => {});
    }

    res.json({ transaksi: trx, message: 'Transaksi sukses' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan' });
  }
});

// Riwayat transaksi
router.get('/riwayat', authMiddleware(true), async (req, res) => {
  try {
    const { from, to, kasir } = req.query;
    let q = supabase.from('transaksi').select('*').order('tanggal', { ascending: false }).limit(200);

    if (from && to) q = q.gte('tanggal', from).lte('tanggal', to);
    if (kasir) q = q.eq('id_user', kasir);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan' });
  }
});

module.exports = router;
