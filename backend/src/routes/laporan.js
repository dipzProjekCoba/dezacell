const express = require('express');
const router = express.Router();
const laporanController = require('../controllers/laporanController');
const authMiddleware = require('../middleware/auth');

// Protected routes
router.get('/harian', authMiddleware(true), laporanController.harian);
router.get('/bulanan', authMiddleware(true), laporanController.bulanan);
router.get('/produk-terlaris', authMiddleware(true), laporanController.produkTerlaris);

module.exports = router;