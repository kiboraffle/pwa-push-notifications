const express = require('express');
const webpush = require('web-push');
const { authenticate, authorize, authorizeClientAccess } = require('../utils/auth');
const { validateNotificationContent, handleMongooseError, validateUrl } = require('../utils/validation');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const Client = require('../models/Client');
const router = express.Router();

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('VAPID keys not configured. Push notifications will not work.');
}

// Apply authentication and client role authorization to all routes
router.use(authenticate);
router.use(authorize('client'));
router.use(authorizeClientAccess);

// GET /api/notifications - Get all notifications for the authenticated client
router.get('/', async (req, res) => {
  try {
    const clientId = req.user.clientId;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Verify client is active
    const client = await Client.findById(clientId);
    if (!client || client.status !== 'active') {
      return res.status(403).json({ 
        message: 'Your account is currently inactive. Please contact support.' 
      });
    }

    const notifications = await Notification.find({ clientId })
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalNotifications = await Notification.countDocuments({ clientId });
    const totalPages = Math.ceil(totalNotifications / limitNum);

    res.status(200).json({
      notifications,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalNotifications,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch notifications',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// GET /api/notifications/stats - Get notification statistics for the client
router.get('/stats', async (req, res) => {
  try {
    const clientId = req.user.clientId;
    
    const totalNotifications = await Notification.countDocuments({ clientId });
    const sentNotifications = await Notification.countDocuments({ clientId, status: 'sent' });
    const failedNotifications = await Notification.countDocuments({ clientId, status: 'failed' });
    const pendingNotifications = await Notification.countDocuments({ clientId, status: 'pending' });
    
    // Get recent notifications (last 5)
    const recentNotifications = await Notification.find({ clientId })
      .sort({ sentAt: -1 })
      .limit(5);

    // Get total subscribers
    const totalSubscribers = await PushSubscription.countDocuments({ clientId });

    res.status(200).json({
      stats: {
        totalNotifications,
        sentNotifications,
        failedNotifications,
        pendingNotifications,
        totalSubscribers
      },
      recentNotifications
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch notification statistics',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// GET /api/notifications/:id - Get single notification by ID (must belong to client)
router.get('/:id', async (req, res) => {
  try {
    const clientId = req.user.clientId;
    const notification = await Notification.findOne({ 
      _id: req.params.id, 
      clientId 
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ notification });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch notification',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// POST /api/notifications/send - Send push notification to all subscribers
router.post('/send', async (req, res) => {
  try {
    const { title, content, promoImageUrl } = req.body;
    const clientId = req.user.clientId;

    // Validate notification content
    const contentValidation = validateNotificationContent(title, content);
    if (!contentValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: contentValidation.errors
      });
    }

    // Validate promo image URL if provided
    let sanitizedPromoImageUrl = null;
    if (promoImageUrl) {
      const urlValidation = validateUrl(promoImageUrl);
      if (!urlValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: urlValidation.message
        });
      }
      sanitizedPromoImageUrl = urlValidation.sanitizedValue;
    }

    // Verify client is active
    const client = await Client.findById(clientId);
    if (!client || client.status !== 'active') {
      return res.status(403).json({ 
        message: 'Your account is currently inactive. Please contact support.' 
      });
    }

    // Get all active push subscriptions for this client
    const subscriptions = await PushSubscription.find({ clientId });
    
    if (subscriptions.length === 0) {
      return res.status(400).json({ 
        message: 'No subscribers found. Add push subscriptions before sending notifications.' 
      });
    }

    // Create notification record
    const notification = new Notification({
      clientId,
      title: contentValidation.sanitizedTitle,
      content: contentValidation.sanitizedContent,
      promoImageUrl: sanitizedPromoImageUrl,
      status: 'pending',
      recipientCount: subscriptions.length
    });

    await notification.save();

    // Send push notifications using web-push library
    const sendNotifications = async () => {
      try {
        let successCount = 0;
        let failureCount = 0;
        const invalidSubscriptions = [];
        
        // Prepare notification payload
        const payload = JSON.stringify({
          title: notification.title,
          body: notification.content,
          icon: client.brandLogoUrl || '/logo192.png',
          badge: '/logo192.png',
          image: notification.promoImageUrl,
          data: {
            clientId: clientId,
            notificationId: notification._id,
            url: '/', // Could be customized per client
            timestamp: Date.now()
          },
          actions: [
            {
              action: 'view',
              title: 'View',
              icon: '/logo192.png'
            },
            {
              action: 'close',
              title: 'Close'
            }
          ],
          requireInteraction: false,
          silent: false,
          tag: `notification-${notification._id}`,
          timestamp: Date.now()
        });

        // Send to all subscriptions
        const sendPromises = subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(sub.subscription, payload);
            successCount++;
            console.log(`Notification sent successfully to subscription ${sub._id}`);
          } catch (error) {
            failureCount++;
            console.error(`Failed to send notification to subscription ${sub._id}:`, error.message);
            
            // Mark subscription as invalid if it's a permanent failure
            if (error.statusCode === 410 || error.statusCode === 404) {
              invalidSubscriptions.push(sub._id);
              console.log(`Marking subscription ${sub._id} as invalid`);
            }
          }
        });

        // Wait for all notifications to be sent
        await Promise.allSettled(sendPromises);
        
        // Remove invalid subscriptions
        if (invalidSubscriptions.length > 0) {
          await PushSubscription.deleteMany({ _id: { $in: invalidSubscriptions } });
          console.log(`Removed ${invalidSubscriptions.length} invalid subscriptions`);
        }
        
        // Update notification with results
        await notification.markAsSent(subscriptions.length, successCount, failureCount);
        
        console.log(`Notification ${notification._id} sent: ${successCount} successful, ${failureCount} failed`);
      } catch (error) {
        console.error('Error sending notifications:', error);
        await notification.markAsFailed(error.message);
      }
    };

    // Send notifications asynchronously
    sendNotifications();

    res.status(202).json({
      success: true,
      message: 'Notification queued for sending',
      notification: {
        id: notification._id,
        title: notification.title,
        content: notification.content,
        status: notification.status,
        recipientCount: notification.recipientCount
      }
    });
  } catch (error) {
    console.error('Send notification error:', error);
    const errorResponse = handleMongooseError(error);
    res.status(errorResponse.status).json({
      success: false,
      message: errorResponse.message,
      errors: errorResponse.errors
    });
  }
});

// POST /api/notifications/preview - Preview notification without sending
router.post('/preview', async (req, res) => {
  try {
    const { title, content, promoImageUrl } = req.body;
    const clientId = req.user.clientId;

    // Validate notification content
    const contentValidation = validateNotificationContent(title, content);
    if (!contentValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: contentValidation.errors
      });
    }

    // Validate promo image URL if provided
    let sanitizedPromoImageUrl = null;
    if (promoImageUrl) {
      const urlValidation = validateUrl(promoImageUrl);
      if (!urlValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: urlValidation.message
        });
      }
      sanitizedPromoImageUrl = urlValidation.sanitizedValue;
    }

    // Get client info for branding
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Get subscriber count
    const subscriberCount = await PushSubscription.countDocuments({ clientId });

    const preview = {
      title: contentValidation.sanitizedTitle,
      content: contentValidation.sanitizedContent,
      promoImageUrl: sanitizedPromoImageUrl,
      brandLogoUrl: client.brandLogoUrl,
      clientName: client.clientName,
      subscriberCount,
      estimatedReach: subscriberCount,
      previewTimestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Notification preview generated',
      preview
    });
  } catch (error) {
    console.error('Preview notification error:', error);
    const errorResponse = handleMongooseError(error);
    res.status(errorResponse.status).json({
      success: false,
      message: errorResponse.message,
      errors: errorResponse.errors
    });
  }
});

// DELETE /api/notifications/:id - Delete notification (must belong to client)
router.delete('/:id', async (req, res) => {
  try {
    const clientId = req.user.clientId;
    
    const notification = await Notification.findOneAndDelete({ 
      _id: req.params.id, 
      clientId 
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      message: 'Failed to delete notification',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

module.exports = router;