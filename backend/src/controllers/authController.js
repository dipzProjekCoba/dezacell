const supabase = require('../config/supabase');
const { comparePassword, hashPassword, signJwt } = require('../utils/helpers');

const authController = {
  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username dan password diperlukan' 
        });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .limit(1)
        .single();

      if (error || !user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Username atau password salah' 
        });
      }

      const match = await comparePassword(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ 
          success: false, 
          message: 'Username atau password salah' 
        });
      }

      const token = signJwt({ 
        id: user.id, 
        username: user.username, 
        level: user.level 
      });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          nama: user.nama,
          level: user.level
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { username, old_password, new_password } = req.body;
      
      if (!username || !old_password || !new_password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Data tidak lengkap' 
        });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .limit(1)
        .single();

      if (error || !user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User tidak ditemukan' 
        });
      }

      const match = await comparePassword(old_password, user.password_hash);
      if (!match) {
        return res.status(401).json({ 
          success: false, 
          message: 'Password lama salah' 
        });
      }

      const newHash = await hashPassword(new_password);
      await supabase
        .from('users')
        .update({ password_hash: newHash, updated_at: new Date() })
        .eq('id', user.id);

      res.json({ 
        success: true, 
        message: 'Password berhasil diubah' 
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  },

  getProfile: async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Tidak terautentikasi' 
        });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, nama, level, created_at')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User tidak ditemukan' 
        });
      }

      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan server' 
      });
    }
  }
};

module.exports = authController;