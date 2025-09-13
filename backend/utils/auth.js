const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'fallback_secret_key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);
    
    const user = await User.findById(decoded.userId).populate('clientId');
    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Authorization middleware for roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. Please authenticate.' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}` 
      });
    }
    
    next();
  };
};

// Client access middleware - ensures user can only access their own client data
const authorizeClientAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Access denied. Please authenticate.' });
  }
  
  // Master users can access any client
  if (req.user.role === 'master') {
    return next();
  }
  
  // Client users can only access their own client data
  const requestedClientId = req.params.clientId || req.body.clientId;
  
  if (req.user.role === 'client') {
    if (!req.user.clientId) {
      return res.status(403).json({ message: 'User not associated with any client.' });
    }
    
    if (requestedClientId && requestedClientId !== req.user.clientId.toString()) {
      return res.status(403).json({ 
        message: 'Access denied. You can only access your own client data.' 
      });
    }
    
    // Set clientId for client users if not provided
    if (!requestedClientId) {
      req.params.clientId = req.user.clientId.toString();
      req.body.clientId = req.user.clientId.toString();
    }
  }
  
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  authorizeClientAccess
};