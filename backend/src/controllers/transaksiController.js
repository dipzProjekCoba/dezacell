const supabase = require('../config/supabase');

const transaksiController = {
  create: async (req, res) => {
    try {
      const { 
        id_user, 
        items, 
        diskon_nominal = 0, 
        uang_diterima, 
        metode_bayar = 'cash' 
      } = req.body;

      // Validation
      if (!id_user || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Data transaksi tidak valid' 
        });
      }

      if (!uang_diterima || uang_diterima <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Uang diterima harus diisi' 
        });
      }

      // Calculate totals
      let total_harga = 0;
      let total_barang = 0;

      // Validate each item and get harga_satuan from barang
      for (const item of items) {
        const { data: barang } = await supabase
          .from('barang')
          .select('harga_jual, stok, nama')
          .eq('id', item.id_barang)
          .single();

        if (!barang) {
          return res.status(400).json({ 
            success: false, 
            message: `Barang dengan ID ${item.id_barang} tidak ditemukan` 
          });
        }

        if (barang.stok < item.qty) {
          return res.status(400).json({ 
            success: false, 
            message: `Stok ${barang.nama} tidak mencukupi. Stok tersedia: ${barang.stok}` 
          });
        }

        item.harga_satuan = barang.harga_jual;
        total_harga += parseInt(item.qty) * parseInt(barang.harga_jual);
        total_barang += parseInt(item.qty);
      }

      const total_bayar = total_harga - parseInt(diskon_nominal);
      
      if (total_bayar <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Total bayar tidak valid' 
        });
      }

      const kembalian = parseInt(uang_diterima) - total_bayar;
      
      if (kembalian < 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Uang diterima kurang dari total bayar' 
        });
      }

      // Generate transaction number
      const date = new Date();
      const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
      const timePart = date.getTime().toString().slice(-6);
      const no_transaksi = `TRX/${datePart}/${timePart}`;

      // Start transaction
      const { data: transaksi, error: transaksiError } = await supabase
        .from('transaksi')
        .insert([{
          no_transaksi,
          id_user,
          total_barang,
          total_harga,
          diskon_nominal: parseInt(diskon_nominal),
          total_bayar,
          uang_diterima: parseInt(uang_diterima),
          kembalian,
          metode_bayar,
          tanggal: date.toISOString(),
          status: 'completed'
        }])
        .select()
        .single();

      if (transaksiError) {
        console.error('Create transaksi error:', transaksiError);
        return res.status(500).json({ 
          success: false, 
          message: 'Gagal membuat transaksi' 
        });
      }

      // Insert details and update stock
      for (const item of items) {
        const subtotal = item.qty * item.harga_satuan;

        // Insert detail
        await supabase
          .from('transaksi_detail')
          .insert([{
            id_transaksi: transaksi.id,
            id_barang: item.id_barang,
            qty: item.qty,
            harga_satuan: item.harga_satuan,
            subtotal
          }]);

        // Update stock (decrement)
        await supabase
          .from('barang')
          .update({ 
            stok: supabase.raw(`stok - ${item.qty}`),
            updated_at: new Date()
          })
          .eq('id', item.id_barang);
      }

      // Get complete transaction data
      const { data: completeTransaksi } = await supabase
        .from('transaksi')
        .select(`
          *,
          user:users(nama),
          detail:transaksi_detail(
            id,
            qty,
            harga_satuan,
            subtotal,
            barang:barang(
              id,
              nama,
              kode_barang
            )
          )
        `)
        .eq('id', transaksi.id)
        .single();

      res.status(201).json({
        success: true,
        message: 'Transaksi berhasil dibuat',
        data: completeTransaksi
      });
    } catch (error) {
      console.error('Create transaksi error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  },

  getRiwayat: async (req, res) => {
    try {
      const { 
        from, 
        to, 
        kasir,
        limit = 200,
        offset = 0,
        search
      } = req.query;

      let query = supabase
        .from('transaksi')
        .select(`
          *,
          user:users(username, nama)
        `, { count: 'exact' })
        .order('tanggal', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (from && to) {
        query = query.gte('tanggal', `${from}T00:00:00Z`)
                    .lte('tanggal', `${to}T23:59:59Z`);
      }

      if (kasir) {
        query = query.eq('id_user', kasir);
      }

      if (search) {
        query = query.ilike('no_transaksi', `%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Get riwayat error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Gagal mengambil riwayat transaksi' 
        });
      }

      // Get details for each transaction
      const transactionsWithDetails = await Promise.all(
        data.map(async (transaksi) => {
          const { data: details } = await supabase
            .from('transaksi_detail')
            .select(`
              id,
              qty,
              harga_satuan,
              subtotal,
              barang:barang(nama, kode_barang)
            `)
            .eq('id_transaksi', transaksi.id);

          return {
            ...transaksi,
            details: details || []
          };
        })
      );

      res.json({
        success: true,
        data: transactionsWithDetails,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Get riwayat error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;

      const { data: transaksi, error } = await supabase
        .from('transaksi')
        .select(`
          *,
          user:users(username, nama),
          detail:transaksi_detail(
            id,
            qty,
            harga_satuan,
            subtotal,
            barang:barang(
              id,
              nama,
              kode_barang,
              harga_jual
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ 
            success: false, 
            message: 'Transaksi tidak ditemukan' 
          });
        }
        throw error;
      }

      res.json({ success: true, data: transaksi });
    } catch (error) {
      console.error('Get transaksi by id error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  },

  getHariIni: async (req, res) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      
      const { data, error } = await supabase
        .from('transaksi')
        .select('*', { count: 'exact' })
        .gte('tanggal', `${today}T00:00:00Z`)
        .lte('tanggal', `${today}T23:59:59Z`)
        .order('tanggal', { ascending: false });

      if (error) {
        console.error('Get transaksi hari ini error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Gagal mengambil transaksi hari ini' 
        });
      }

      // Calculate totals
      const totals = data.reduce((acc, transaksi) => {
        acc.total_transaksi += 1;
        acc.total_pendapatan += transaksi.total_bayar;
        return acc;
      }, { total_transaksi: 0, total_pendapatan: 0 });

      res.json({
        success: true,
        data,
        summary: {
          ...totals,
          tanggal: today
        }
      });
    } catch (error) {
      console.error('Get transaksi hari ini error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  }
};

module.exports = transaksiController;