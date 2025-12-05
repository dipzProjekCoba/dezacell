const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
require('dotenv').config();


const authRoutes = require('./routes/auth');
const barangRoutes = require('./routes/barang');
const transaksiRoutes = require('./routes/transaksi');
const laporanRoutes = require('./routes/laporan');


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());


app.use('/api/auth', authRoutes);
app.use('/api/barang', barangRoutes);
app.use('/api/transaksi', transaksiRoutes);
app.use('/api/laporan', laporanRoutes);


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`DezaCell backend running on port ${PORT}`));

