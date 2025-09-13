const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client ID is required']
  },
  subscription: {
    type: Object,
    required: [true, 'Subscription object is required'],
    validate: {
      validator: function(v) {
        // Validate that subscription has required properties for web push
        return v && 
               typeof v.endpoint === 'string' && 
               v.keys && 
               typeof v.keys.p256dh === 'string' && 
               typeof v.keys.auth === 'string';
      },
      message: 'Subscription must contain endpoint and keys (p256dh, auth)'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    domain: { type: String, default: 'unknown' },
    userAgent: { type: String, default: 'unknown' },
    ipAddress: { type: String },
    subscribedAt: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate subscriptions for the same client
pushSubscriptionSchema.index({ clientId: 1, 'subscription.endpoint': 1 }, { unique: true });

// Index for better query performance
pushSubscriptionSchema.index({ clientId: 1 });
pushSubscriptionSchema.index({ createdAt: -1 });

// Virtual to populate client information
pushSubscriptionSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
pushSubscriptionSchema.set('toJSON', { virtuals: true });
pushSubscriptionSchema.set('toObject', { virtuals: true });

// Pre-save middleware to validate client exists and is active
pushSubscriptionSchema.pre('save', async function(next) {
  try {
    const Client = mongoose.model('Client');
    const client = await Client.findById(this.clientId);
    
    if (!client) {
      return next(new Error('Client not found'));
    }
    
    if (client.status !== 'active') {
      return next(new Error('Cannot add subscription to inactive client'));
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to find subscriptions by client
pushSubscriptionSchema.statics.findByClient = function(clientId) {
  return this.find({ clientId }).populate('client');
};

// Static method to find active subscriptions by client
pushSubscriptionSchema.statics.findActiveByClient = function(clientId) {
  return this.find({ clientId })
    .populate({
      path: 'client',
      match: { status: 'active' }
    })
    .then(subscriptions => subscriptions.filter(sub => sub.client));
};

// Static method to remove subscription by endpoint
pushSubscriptionSchema.statics.removeByEndpoint = function(endpoint, clientId) {
  return this.deleteOne({ 
    clientId, 
    'subscription.endpoint': endpoint 
  });
};

// Instance method to check if subscription is valid
pushSubscriptionSchema.methods.isValid = function() {
  const subscription = this.subscription;
  return subscription && 
         subscription.endpoint && 
         subscription.keys && 
         subscription.keys.p256dh && 
         subscription.keys.auth;
};

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);