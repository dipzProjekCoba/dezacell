const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { hashPassword, comparePassword, signJwt } = require('../utils/helpers');


// Login
router.post('/login', async (req, res) => {
const { username, password } = req.body;
if (!username || !password) return res.status(400).json({ message: 'Username & password required' });


const { data, error } = await supabase
.from('users')
.select('*')
.eq('username', username)
.limit(1)
.single();


if (error || !data) return res.status(401).json({ message: 'Invalid credentials' });


const match = await comparePassword(password, data.password_hash);
if (!match) return res.status(401).json({ message: 'Invalid credentials' });


const token = signJwt({ id: data.id, username: data.username, level: data.level });
res.json({ token, user: { id: data.id, username: data.username, nama: data.nama, level: data.level } });
});


// Change password
router.post('/change-password', async (req, res) => {
const { username, old_password, new_password } = req.body;
if (!username || !old_password || !new_password) return res.status(400).json({ message: 'Invalid payload' });


const { data } = await supabase.from('users').select('*').eq('username', username).limit(1).single();
if (!data) return res.status(404).json({ message: 'User not found' });


const match = await comparePassword(old_password, data.password_hash);
if (!match) return res.status(401).json({ message: 'Old password incorrect' });


const newHash = await hashPassword(new_password);
await supabase.from('users').update({ password_hash: newHash }).eq('id', data.id);
res.json({ message: 'Password updated' });
});


module.exports = router;