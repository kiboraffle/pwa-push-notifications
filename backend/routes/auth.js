const express = require('express');
const { generateToken, authenticate } = require('../utils/auth');
const User = require('../models/User');
const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, clientId } = req.body;
    
    // Validate required fields
    if (!email || !password || !role) {
      return res.status(400).json({ 
        message: 'Email, password, and role are required' 
      });
    }
    
    // Validate role
    if (!['master', 'client'].includes(role)) {
      return res.status(400).json({ 
        message: 'Role must be either master or client' 
      });
    }
    
    // Validate clientId for client role
    if (role === 'client' && !clientId) {
      return res.status(400).json({ 
        message: 'Client ID is required for client role' 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        message: 'User with this email already exists' 
      });
    }
    
    // Create new user
    const userData = { email, password, role };
    if (role === 'client') {
      userData.clientId = clientId;
    }
    
    const user = new User(userData);
    await user.save();
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email }).populate('clientId');
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }
    
    // Check if client is active (for client users)
    if (user.role === 'client' && user.clientId && user.clientId.status !== 'active') {
      return res.status(403).json({ 
        message: 'Your account is currently inactive. Please contact support.' 
      });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Login failed',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('clientId');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// Verify token endpoint
router.post('/verify', authenticate, (req, res) => {
  res.status(200).json({
    message: 'Token is valid',
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      clientId: req.user.clientId
    }
  });
});

module.exports = router;