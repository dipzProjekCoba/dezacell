const express = require('express');
const router = express.Router();
const barangController = require('../controllers/barangController');
const authMiddleware = require('../middleware/auth');

// Public routes (read only)
router.get('/', authMiddleware(false), barangController.getAll);
router.get('/low-stock', authMiddleware(false), barangController.getLowStock);
router.get('/:id', authMiddleware(false), barangController.getById);

// Protected routes (require auth)
router.post('/', authMiddleware(true), barangController.create);
router.put('/:id', authMiddleware(true), barangController.update);
router.delete('/:id', authMiddleware(true), barangController.delete);
router.patch('/:id/stok', authMiddleware(true), barangController.updateStok);

module.exports = router;