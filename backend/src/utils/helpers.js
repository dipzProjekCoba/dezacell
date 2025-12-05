const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const SALT_ROUNDS = parseInt(process.env.PASSWORD_SALT_ROUNDS || '10');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';


async function hashPassword(plain) {
return await bcrypt.hash(plain, SALT_ROUNDS);
}


async function comparePassword(plain, hash) {
return await bcrypt.compare(plain, hash);
}


function signJwt(payload) {
return jwt.sign(payload, JWT_SECRET, { expiresIn: '30m' });
}


function verifyJwt(token) {
try {
return jwt.verify(token, JWT_SECRET);
} catch (err) {
return null;
}
}


module.exports = { hashPassword, comparePassword, signJwt, verifyJwt };

