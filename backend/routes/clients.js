const express = require('express');
const { authenticate, authorize } = require('../utils/auth');
const { validateClientData, handleMongooseError, validateObjectId } = require('../utils/validation');
const Client = require('../models/Client');
const User = require('../models/User');
const router = express.Router();

// Apply authentication and master role authorization to all routes
router.use(authenticate);
router.use(authorize('master'));

// GET /api/clients - Get all clients with pagination and search
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build search query
    const searchQuery = {};
    if (search) {
      searchQuery.clientName = { $regex: search, $options: 'i' };
    }
    if (status && ['active', 'inactive'].includes(status)) {
      searchQuery.status = status;
    }

    // Get clients with pagination
    const clients = await Client.find(searchQuery)
      .populate('managedBy', 'email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const totalClients = await Client.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalClients / limitNum);

    res.status(200).json({
      clients,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalClients,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch clients',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// GET /api/clients/stats - Get client statistics
router.get('/stats', async (req, res) => {
  try {
    const totalClients = await Client.countDocuments();
    const activeClients = await Client.countDocuments({ status: 'active' });
    const inactiveClients = await Client.countDocuments({ status: 'inactive' });
    
    // Get recent clients (last 5)
    const recentClients = await Client.find()
      .populate('managedBy', 'email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      stats: {
        totalClients,
        activeClients,
        inactiveClients
      },
      recentClients
    });
  } catch (error) {
    console.error('Get client stats error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch client statistics',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// GET /api/clients/:id - Get single client by ID
router.get('/:id', async (req, res) => {
  try {
    // Validate ObjectId
    const idValidation = validateObjectId(req.params.id, 'Client ID');
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: idValidation.message
      });
    }

    const client = await Client.findById(req.params.id)
      .populate('managedBy', 'email')
      .populate('domains')
      .populate('pushSubscriptions')
      .populate('notifications');

    if (!client) {
      return res.status(404).json({ 
        success: false,
        message: 'Client not found' 
      });
    }

    res.status(200).json({ 
      success: true,
      client 
    });
  } catch (error) {
    console.error('Get client error:', error);
    const errorResponse = handleMongooseError(error);
    res.status(errorResponse.status).json({
      success: false,
      message: errorResponse.message,
      errors: errorResponse.errors
    });
  }
});

// POST /api/clients - Create new client
router.post('/', async (req, res) => {
  try {
    const { clientName, brandLogoUrl, email, password } = req.body;

    // Validate input data
    const validation = validateClientData(clientName, email, password, brandLogoUrl);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Use sanitized data
    const sanitizedData = validation.sanitizedData;

    // Check if user with email already exists
    const existingUser = await User.findOne({ email: sanitizedData.email });
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: 'User with this email already exists' 
      });
    }

    // Create client
    const clientData = {
      clientName: sanitizedData.clientName,
      managedBy: req.user._id
    };
    
    if (sanitizedData.brandLogoUrl) {
      clientData.brandLogoUrl = sanitizedData.brandLogoUrl;
    }

    const client = new Client(clientData);
    await client.save();

    // Create client user
    const userData = {
      email: sanitizedData.email,
      password,
      role: 'client',
      clientId: client._id
    };

    const user = new User(userData);
    await user.save();

    // Populate the response
    await client.populate('managedBy', 'email');

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      client,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Create client error:', error);
    const errorResponse = handleMongooseError(error);
    res.status(errorResponse.status).json({
      success: false,
      message: errorResponse.message,
      errors: errorResponse.errors
    });
  }
});

// PUT /api/clients/:id - Update client
router.put('/:id', async (req, res) => {
  try {
    const { clientName, brandLogoUrl, status } = req.body;
    
    const updateData = {};
    if (clientName) updateData.clientName = clientName;
    if (brandLogoUrl !== undefined) updateData.brandLogoUrl = brandLogoUrl;
    if (status && ['active', 'inactive'].includes(status)) {
      updateData.status = status;
    }

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('managedBy', 'email');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.status(200).json({
      message: 'Client updated successfully',
      client
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ 
      message: 'Failed to update client',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// PATCH /api/clients/:id/status - Toggle client status
router.patch('/:id/status', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Toggle status
    client.status = client.status === 'active' ? 'inactive' : 'active';
    await client.save();

    await client.populate('managedBy', 'email');

    res.status(200).json({
      message: `Client ${client.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      client
    });
  } catch (error) {
    console.error('Toggle client status error:', error);
    res.status(500).json({ 
      message: 'Failed to update client status',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// DELETE /api/clients/:id - Delete client
router.delete('/:id', async (req, res) => {
  try {
    // Validate ObjectId
    const idValidation = validateObjectId(req.params.id, 'Client ID');
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: idValidation.message
      });
    }

    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ 
        success: false,
        message: 'Client not found' 
      });
    }

    // Delete associated user accounts
    await User.deleteMany({ clientId: client._id });
    
    // Delete the client (this will trigger the pre-remove middleware to clean up related data)
    await client.remove();

    res.status(200).json({
      success: true,
      message: 'Client and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Delete client error:', error);
    const errorResponse = handleMongooseError(error);
    res.status(errorResponse.status).json({
      success: false,
      message: errorResponse.message,
      errors: errorResponse.errors
    });
  }
});

module.exports = router;