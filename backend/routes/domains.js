const express = require('express');
const { authenticate, authorize, authorizeClientAccess } = require('../utils/auth');
const { validateDomain, handleMongooseError, validateObjectId } = require('../utils/validation');
const Domain = require('../models/Domain');
const Client = require('../models/Client');
const router = express.Router();

// Apply authentication and client role authorization to all routes
router.use(authenticate);
router.use(authorize('client'));
router.use(authorizeClientAccess);

// GET /api/domains - Get all domains for the authenticated client
router.get('/', async (req, res) => {
  try {
    const clientId = req.user.clientId;
    
    // Verify client is active
    const client = await Client.findById(clientId);
    if (!client || client.status !== 'active') {
      return res.status(403).json({ 
        message: 'Your account is currently inactive. Please contact support.' 
      });
    }

    const domains = await Domain.find({ clientId })
      .populate('client', 'clientName status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      domains,
      totalDomains: domains.length
    });
  } catch (error) {
    console.error('Get domains error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch domains',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// GET /api/domains/stats - Get domain statistics for the client
router.get('/stats', async (req, res) => {
  try {
    const clientId = req.user.clientId;
    
    const totalDomains = await Domain.countDocuments({ clientId });
    
    // Get recent domains (last 5)
    const recentDomains = await Domain.find({ clientId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      stats: {
        totalDomains
      },
      recentDomains
    });
  } catch (error) {
    console.error('Get domain stats error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch domain statistics',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// GET /api/domains/:id - Get single domain by ID (must belong to client)
router.get('/:id', async (req, res) => {
  try {
    const clientId = req.user.clientId;
    const domain = await Domain.findOne({ 
      _id: req.params.id, 
      clientId 
    }).populate('client', 'clientName status');

    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    res.status(200).json({ domain });
  } catch (error) {
    console.error('Get domain error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch domain',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// POST /api/domains - Add new domain for the authenticated client
router.post('/', async (req, res) => {
  try {
    const { domainName } = req.body;
    const clientId = req.user.clientId;

    // Validate domain name
    const domainValidation = validateDomain(domainName);
    if (!domainValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: domainValidation.message
      });
    }

    const sanitizedDomain = domainValidation.sanitizedValue;

    // Verify client is active
    const client = await Client.findById(clientId);
    if (!client || client.status !== 'active') {
      return res.status(403).json({ 
        message: 'Your account is currently inactive. Please contact support.' 
      });
    }

    // Check if domain already exists for this client
    const existingDomain = await Domain.findOne({ 
      clientId, 
      domainName: sanitizedDomain 
    });
    
    if (existingDomain) {
      return res.status(409).json({ 
        message: 'This domain is already registered for your account' 
      });
    }

    // Create new domain
    const domain = new Domain({
      clientId,
      domainName: sanitizedDomain
    });

    await domain.save();
    await domain.populate('client', 'clientName status');

    res.status(201).json({
      success: true,
      message: 'Domain added successfully',
      domain
    });
  } catch (error) {
    console.error('Add domain error:', error);
    const errorResponse = handleMongooseError(error);
    res.status(errorResponse.status).json({
      success: false,
      message: errorResponse.message,
      errors: errorResponse.errors
    });
  }
});

// PUT /api/domains/:id - Update domain (must belong to client)
router.put('/:id', async (req, res) => {
  try {
    const { domainName } = req.body;
    const clientId = req.user.clientId;
    
    if (!domainName) {
      return res.status(400).json({ 
        message: 'Domain name is required' 
      });
    }

    // Check if new domain name already exists for this client (excluding current domain)
    const existingDomain = await Domain.findOne({ 
      clientId, 
      domainName: domainName.toLowerCase().trim(),
      _id: { $ne: req.params.id }
    });
    
    if (existingDomain) {
      return res.status(409).json({ 
        message: 'This domain name is already registered for your account' 
      });
    }

    const domain = await Domain.findOneAndUpdate(
      { _id: req.params.id, clientId },
      { domainName: domainName.toLowerCase().trim() },
      { new: true, runValidators: true }
    ).populate('client', 'clientName status');

    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    res.status(200).json({
      message: 'Domain updated successfully',
      domain
    });
  } catch (error) {
    console.error('Update domain error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to update domain',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// DELETE /api/domains/:id - Delete domain (must belong to client)
router.delete('/:id', async (req, res) => {
  try {
    const clientId = req.user.clientId;
    
    // Validate ObjectId
    const idValidation = validateObjectId(req.params.id, 'Domain ID');
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: idValidation.message
      });
    }
    
    const domain = await Domain.findOneAndDelete({ 
      _id: req.params.id, 
      clientId 
    });
    
    if (!domain) {
      return res.status(404).json({ 
        success: false,
        message: 'Domain not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Domain deleted successfully'
    });
  } catch (error) {
    console.error('Delete domain error:', error);
    const errorResponse = handleMongooseError(error);
    res.status(errorResponse.status).json({
      success: false,
      message: errorResponse.message,
      errors: errorResponse.errors
    });
  }
});

// POST /api/domains/verify - Verify domain ownership (placeholder for future implementation)
router.post('/verify', async (req, res) => {
  try {
    const { domainId } = req.body;
    const clientId = req.user.clientId;
    
    if (!domainId) {
      return res.status(400).json({ 
        message: 'Domain ID is required' 
      });
    }

    const domain = await Domain.findOne({ 
      _id: domainId, 
      clientId 
    });
    
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    // TODO: Implement actual domain verification logic
    // This could involve DNS verification, file upload verification, etc.
    
    res.status(200).json({
      message: 'Domain verification initiated',
      domain,
      note: 'Domain verification feature will be implemented in a future update'
    });
  } catch (error) {
    console.error('Verify domain error:', error);
    res.status(500).json({ 
      message: 'Failed to verify domain',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

module.exports = router;