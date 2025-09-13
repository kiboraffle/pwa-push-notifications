const express = require('express');
const PushSubscription = require('../models/PushSubscription');
const Client = require('../models/Client');
const Domain = require('../models/Domain');
const router = express.Router();

// Public endpoint for external websites to register push subscriptions
// No authentication required as this is called from external websites
router.post('/', async (req, res) => {
  try {
    const { subscription, clientId, domain } = req.body;

    // Validate required fields
    if (!subscription || !clientId) {
      return res.status(400).json({ 
        success: false,
        message: 'Subscription object and clientId are required' 
      });
    }

    // Validate subscription object structure
    if (!subscription.endpoint || !subscription.keys || 
        !subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid subscription object. Must contain endpoint and keys (p256dh, auth)' 
      });
    }

    // Verify client exists and is active
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ 
        success: false,
        message: 'Client not found' 
      });
    }

    if (client.status !== 'active') {
      return res.status(403).json({ 
        success: false,
        message: 'Client account is not active' 
      });
    }

    // Optional: Verify domain ownership if domain is provided
    if (domain) {
      const domainExists = await Domain.findOne({ 
        clientId, 
        domainName: domain.toLowerCase() 
      });
      
      if (!domainExists) {
        console.warn(`Domain ${domain} not registered for client ${clientId}`);
        // We'll allow it but log a warning
      }
    }

    // Check if subscription already exists (prevent duplicates)
    const existingSubscription = await PushSubscription.findOne({
      clientId,
      'subscription.endpoint': subscription.endpoint
    });

    if (existingSubscription) {
      // Update existing subscription with new data
      existingSubscription.subscription = subscription;
      await existingSubscription.save();
      
      return res.status(200).json({
        success: true,
        message: 'Subscription updated successfully',
        subscriptionId: existingSubscription._id
      });
    }

    // Create new push subscription
    const pushSubscription = new PushSubscription({
      clientId,
      subscription,
      metadata: {
        domain: domain || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        ipAddress: req.ip || req.connection.remoteAddress,
        subscribedAt: new Date()
      }
    });

    await pushSubscription.save();

    // Log successful subscription
    console.log(`New push subscription registered for client ${clientId} from domain ${domain || 'unknown'}`);

    res.status(201).json({
      success: true,
      message: 'Subscription registered successfully',
      subscriptionId: pushSubscription._id
    });

  } catch (error) {
    console.error('Subscribe endpoint error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false,
        message: 'Subscription already exists for this client and endpoint'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to register subscription',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// Public endpoint to unsubscribe
router.delete('/', async (req, res) => {
  try {
    const { endpoint, clientId } = req.body;

    if (!endpoint || !clientId) {
      return res.status(400).json({ 
        success: false,
        message: 'Endpoint and clientId are required' 
      });
    }

    const result = await PushSubscription.deleteOne({
      clientId,
      'subscription.endpoint': endpoint
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Subscription not found' 
      });
    }

    console.log(`Push subscription unregistered for client ${clientId}`);

    res.status(200).json({
      success: true,
      message: 'Subscription removed successfully'
    });

  } catch (error) {
    console.error('Unsubscribe endpoint error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to remove subscription',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// Public endpoint to get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    
    if (!publicKey) {
      return res.status(500).json({ 
        success: false,
        message: 'VAPID public key not configured' 
      });
    }

    res.status(200).json({
      success: true,
      publicKey
    });
  } catch (error) {
    console.error('VAPID public key endpoint error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get VAPID public key'
    });
  }
});

module.exports = router;