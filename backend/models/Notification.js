const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client ID is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    maxlength: [500, 'Content cannot exceed 500 characters']
  },
  promoImageUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Allow empty string or valid URL
        if (!v) return true;
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Promo image URL must be a valid HTTP/HTTPS URL'
    }
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  // Additional fields for tracking notification status
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  recipientCount: {
    type: Number,
    default: 0,
    min: 0
  },
  successCount: {
    type: Number,
    default: 0,
    min: 0
  },
  failureCount: {
    type: Number,
    default: 0,
    min: 0
  },
  errorMessage: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
notificationSchema.index({ clientId: 1 });
notificationSchema.index({ sentAt: -1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ clientId: 1, sentAt: -1 });

// Virtual to populate client information
notificationSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

// Pre-save middleware to validate client exists
notificationSchema.pre('save', async function(next) {
  try {
    const Client = mongoose.model('Client');
    const client = await Client.findById(this.clientId);
    
    if (!client) {
      return next(new Error('Client not found'));
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to find notifications by client
notificationSchema.statics.findByClient = function(clientId, limit = 50) {
  return this.find({ clientId })
    .populate('client')
    .sort({ sentAt: -1 })
    .limit(limit);
};

// Static method to get notification statistics for a client
notificationSchema.statics.getClientStats = async function(clientId, startDate, endDate) {
  const matchQuery = { clientId };
  
  if (startDate || endDate) {
    matchQuery.sentAt = {};
    if (startDate) matchQuery.sentAt.$gte = new Date(startDate);
    if (endDate) matchQuery.sentAt.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRecipients: { $sum: '$recipientCount' },
        totalSuccess: { $sum: '$successCount' },
        totalFailures: { $sum: '$failureCount' }
      }
    }
  ]);
};

// Instance method to mark notification as sent
notificationSchema.methods.markAsSent = function(recipientCount, successCount, failureCount) {
  this.status = 'sent';
  this.recipientCount = recipientCount || 0;
  this.successCount = successCount || 0;
  this.failureCount = failureCount || 0;
  this.sentAt = new Date();
  return this.save();
};

// Instance method to mark notification as failed
notificationSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);