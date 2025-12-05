const express = require('express');
const router = express.Router();
const transaksiController = require('../controllers/transaksiController');
const authMiddleware = require('../middleware/auth');

// Protected routes (all require auth)
router.post('/', authMiddleware(true), transaksiController.create);
router.get('/riwayat', authMiddleware(true), transaksiController.getRiwayat);
router.get('/hari-ini', authMiddleware(true), transaksiController.getHariIni);
router.get('/:id', authMiddleware(true), transaksiController.getById);

module.exports = router;