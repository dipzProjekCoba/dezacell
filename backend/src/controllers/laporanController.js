const supabase = require('../config/supabase');

const laporanController = {
  harian: async (req, res) => {
    try {
      const { date } = req.query; // format: YYYY-MM-DD
      const targetDate = date || new Date().toISOString().slice(0, 10);
      
      const from = `${targetDate}T00:00:00Z`;
      const to = `${targetDate}T23:59:59Z`;

      // Get transactions for the date
      const { data: transaksi, error } = await supabase
        .from('transaksi')
        .select(`
          *,
          user:users(nama),
          detail:transaksi_detail(
            qty,
            harga_satuan,
            subtotal,
            barang:barang(nama, kategori:kategori_id(nama_kategori))
          )
        `)
        .gte('tanggal', from)
        .lte('tanggal', to)
        .order('tanggal', { ascending: true });

      if (error) {
        console.error('Get laporan harian error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Gagal mengambil laporan harian' 
        });
      }

      // Calculate summary
      const summary = {
        total_transaksi: transaksi.length,
        total_pendapatan: transaksi.reduce((sum, t) => sum + t.total_bayar, 0),
        total_barang_terjual: transaksi.reduce((sum, t) => sum + t.total_barang, 0),
        total_diskon: transaksi.reduce((sum, t) => sum + (t.diskon_nominal || 0), 0),
        tanggal: targetDate
      };

      // Group by kategori
      const kategoriSummary = {};
      transaksi.forEach(t => {
        t.detail.forEach(d => {
          const kategori = d.barang.kategori?.nama_kategori || 'Lainnya';
          if (!kategoriSummary[kategori]) {
            kategoriSummary[kategori] = {
              total_qty: 0,
              total_value: 0
            };
          }
          kategoriSummary[kategori].total_qty += d.qty;
          kategoriSummary[kategori].total_value += d.subtotal;
        });
      });

      // Top 5 products
      const productSales = {};
      transaksi.forEach(t => {
        t.detail.forEach(d => {
          const productName = d.barang.nama;
          if (!productSales[productName]) {
            productSales[productName] = {
              qty: 0,
              value: 0
            };
          }
          productSales[productName].qty += d.qty;
          productSales[productName].value += d.subtotal;
        });
      });

      const topProducts = Object.entries(productSales)
        .map(([name, data]) => ({
          nama: name,
          qty: data.qty,
          value: data.value
        }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      res.json({
        success: true,
        data: {
          summary,
          transaksi,
          kategori: kategoriSummary,
          top_products: topProducts
        }
      });
    } catch (error) {
      console.error('Get laporan harian error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  },

  bulanan: async (req, res) => {
    try {
      const { year, month } = req.query;
      const now = new Date();
      const targetYear = year || now.getFullYear();
      const targetMonth = month || now.getMonth() + 1;

      const from = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01T00:00:00Z`;
      const to = new Date(targetYear, targetMonth, 0, 23, 59, 59).toISOString();

      const { data: transaksi, error } = await supabase
        .from('transaksi')
        .select('*')
        .gte('tanggal', from)
        .lte('tanggal', to);

      if (error) {
        console.error('Get laporan bulanan error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Gagal mengambil laporan bulanan' 
        });
      }

      // Daily summary for the month
      const dailySummary = {};
      transaksi.forEach(t => {
        const date = t.tanggal.slice(0, 10);
        if (!dailySummary[date]) {
          dailySummary[date] = {
            total_transaksi: 0,
            total_pendapatan: 0,
            total_barang: 0
          };
        }
        dailySummary[date].total_transaksi += 1;
        dailySummary[date].total_pendapatan += t.total_bayar;
        dailySummary[date].total_barang += t.total_barang;
      });

      // Monthly summary
      const monthlySummary = transaksi.reduce((acc, t) => {
        acc.total_transaksi += 1;
        acc.total_pendapatan += t.total_bayar;
        acc.total_barang += t.total_barang;
        acc.total_diskon += t.diskon_nominal || 0;
        return acc;
      }, {
        total_transaksi: 0,
        total_pendapatan: 0,
        total_barang: 0,
        total_diskon: 0,
        tahun: targetYear,
        bulan: targetMonth
      });

      res.json({
        success: true,
        data: {
          summary: monthlySummary,
          daily: dailySummary,
          transaksi_count: transaksi.length
        }
      });
    } catch (error) {
      console.error('Get laporan bulanan error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  },

  produkTerlaris: async (req, res) => {
    try {
      const { limit = 10, start_date, end_date } = req.query;

      let query = supabase
        .from('transaksi_detail')
        .select(`
          qty,
          harga_satuan,
          subtotal,
          barang:barang(id, nama, kode_barang, kategori:kategori_id(nama_kategori)),
          transaksi:transaksi(tanggal)
        `);

      if (start_date && end_date) {
        query = query
          .gte('transaksi.tanggal', `${start_date}T00:00:00Z`)
          .lte('transaksi.tanggal', `${end_date}T23:59:59Z`);
      }

      const { data: details, error } = await query;

      if (error) {
        console.error('Get produk terlaris error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Gagal mengambil data produk terlaris' 
        });
      }

      // Group by product
      const productStats = {};
      details.forEach(d => {
        const productId = d.barang.id;
        if (!productStats[productId]) {
          productStats[productId] = {
            id: productId,
            nama: d.barang.nama,
            kode_barang: d.barang.kode_barang,
            kategori: d.barang.kategori?.nama_kategori,
            total_qty: 0,
            total_value: 0,
            jumlah_transaksi: 0
          };
        }
        productStats[productId].total_qty += d.qty;
        productStats[productId].total_value += d.subtotal;
        productStats[productId].jumlah_transaksi += 1;
      });

      const sortedProducts = Object.values(productStats)
        .sort((a, b) => b.total_qty - a.total_qty)
        .slice(0, parseInt(limit));

      res.json({
        success: true,
        data: sortedProducts,
        periode: {
          start: start_date,
          end: end_date
        }
      });
    } catch (error) {
      console.error('Get produk terlaris error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  }
};

module.exports = laporanController;