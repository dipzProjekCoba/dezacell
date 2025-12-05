const { verifyJwt } = require('../utils/helpers');


function authMiddleware(required = false) {
return (req, res, next) => {
const authHeader = req.headers['authorization'];
if (!authHeader) {
if (required) return res.status(401).json({ message: 'Unauthorized' });
req.user = null; return next();
}
const token = authHeader.split(' ')[1];
const payload = verifyJwt(token);
if (!payload) return res.status(401).json({ message: 'Invalid token' });
req.user = payload;
next();
};
}


module.exports = authMiddleware;