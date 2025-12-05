const supabase = require('../config/supabase');

const barangController = {
  getAll: async (req, res) => {
    try {
      const { 
        q, 
        kategori, 
        limit = 50, 
        offset = 0,
        sortBy = 'id',
        sortOrder = 'asc'
      } = req.query;

      let query = supabase
        .from('barang')
        .select(`
          *,
          kategori:kategori_id(nama_kategori)
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (q) {
        query = query.or(`nama.ilike.%${q}%,kode_barang.ilike.%${q}%`);
      }
      
      if (kategori) {
        query = query.eq('id_kategori', kategori);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Get barang error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Gagal mengambil data barang' 
        });
      }

      // Get total count for pagination
      let total = 0;
      if (count) {
        total = count;
      } else {
        const { count: totalCount } = await supabase
          .from('barang')
          .select('*', { count: 'exact', head: true });
        total = totalCount || 0;
      }

      res.json({
        success: true,
        data,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        }
      });
    } catch (error) {
      console.error('Get barang error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('barang')
        .select(`
          *,
          kategori:kategori_id(nama_kategori)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ 
            success: false, 
            message: 'Barang tidak ditemukan' 
          });
        }
        throw error;
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error('Get barang by id error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  },

  create: async (req, res) => {
    try {
      const {
        kode_barang,
        nama,
        id_kategori,
        merek,
        tipe,
        kondisi,
        harga_beli,
        harga_jual,
        stok,
        stok_min = 5,
        deskripsi = ''
      } = req.body;

      // Validation
      if (!kode_barang || !nama || !harga_jual || !stok) {
        return res.status(400).json({ 
          success: false, 
          message: 'Data barang tidak lengkap' 
        });
      }

      // Check if kode_barang already exists
      const { data: existing } = await supabase
        .from('barang')
        .select('id')
        .eq('kode_barang', kode_barang)
        .single();

      if (existing) {
        return res.status(400).json({ 
          success: false, 
          message: 'Kode barang sudah terdaftar' 
        });
      }

      const payload = {
        kode_barang,
        nama,
        id_kategori: id_kategori || null,
        merek: merek || '',
        tipe: tipe || '',
        kondisi: kondisi || 'Baru',
        harga_beli: harga_beli || 0,
        harga_jual,
        stok,
        stok_min,
        deskripsi,
        created_at: new Date(),
        updated_at: new Date()
      };

      const { data, error } = await supabase
        .from('barang')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Create barang error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Gagal menambahkan barang' 
        });
      }

      res.status(201).json({ 
        success: true, 
        message: 'Barang berhasil ditambahkan',
        data 
      });
    } catch (error) {
      console.error('Create barang error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body;

      // Check if barang exists
      const { data: existing } = await supabase
        .from('barang')
        .select('id')
        .eq('id', id)
        .single();

      if (!existing) {
        return res.status(404).json({ 
          success: false, 
          message: 'Barang tidak ditemukan' 
        });
      }

      payload.updated_at = new Date();

      const { data, error } = await supabase
        .from('barang')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update barang error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Gagal mengupdate barang' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Barang berhasil diupdate',
        data 
      });
    } catch (error) {
      console.error('Update barang error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if barang exists
      const { data: existing } = await supabase
        .from('barang')
        .select('id')
        .eq('id', id)
        .single();

      if (!existing) {
        return res.status(404).json({ 
          success: false, 
          message: 'Barang tidak ditemukan' 
        });
      }

      // Check if barang has transactions
      const { data: transactions } = await supabase
        .from('transaksi_detail')
        .select('id')
        .eq('id_barang', id)
        .limit(1);

      if (transactions && transactions.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Barang tidak dapat dihapus karena memiliki transaksi' 
        });
      }

      const { error } = await supabase
        .from('barang')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete barang error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Gagal menghapus barang' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Barang berhasil dihapus' 
      });
    } catch (error) {
      console.error('Delete barang error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  },

  updateStok: async (req, res) => {
    try {
      const { id } = req.params;
      const { stok, action = 'set' } = req.body; // action: 'set', 'add', 'subtract'

      if (!stok && stok !== 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Stok harus diisi' 
        });
      }

      const { data: barang } = await supabase
        .from('barang')
        .select('stok')
        .eq('id', id)
        .single();

      if (!barang) {
        return res.status(404).json({ 
          success: false, 
          message: 'Barang tidak ditemukan' 
        });
      }

      let newStok = barang.stok;
      
      if (action === 'set') {
        newStok = parseInt(stok);
      } else if (action === 'add') {
        newStok = barang.stok + parseInt(stok);
      } else if (action === 'subtract') {
        newStok = barang.stok - parseInt(stok);
        if (newStok < 0) newStok = 0;
      }

      const { data, error } = await supabase
        .from('barang')
        .update({ 
          stok: newStok,
          updated_at: new Date() 
        })
        .eq('id', id)
        .select('id, nama, stok')
        .single();

      if (error) {
        console.error('Update stok error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Gagal mengupdate stok' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Stok berhasil diupdate',
        data 
      });
    } catch (error) {
      console.error('Update stok error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  },

  getLowStock: async (req, res) => {
    try {
      const { limit = 20 } = req.query;

      const { data, error } = await supabase
        .from('barang')
        .select(`
          *,
          kategori:kategori_id(nama_kategori)
        `)
        .lte('stok', supabase.raw('stok_min'))
        .order('stok', { ascending: true })
        .limit(parseInt(limit));

      if (error) {
        console.error('Get low stock error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Gagal mengambil data stok rendah' 
        });
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error('Get low stock error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  }
};

module.exports = barangController;