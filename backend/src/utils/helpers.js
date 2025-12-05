const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const SALT_ROUNDS = parseInt(process.env.PASSWORD_SALT_ROUNDS || '10');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

async function hashPassword(plain) {
  return await bcrypt.hash(plain, SALT_ROUNDS);
}

async function comparePassword(plain, hash) {
  return await bcrypt.compare(plain, hash);
}

function signJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyJwt(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Format currency (Rp)
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

// Generate random string
function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Validate email
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Format date to Indonesian
function formatDateID(date) {
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return new Date(date).toLocaleDateString('id-ID', options);
}

module.exports = {
  hashPassword,
  comparePassword,
  signJwt,
  verifyJwt,
  formatCurrency,
  generateRandomString,
  validateEmail,
  formatDateID
};