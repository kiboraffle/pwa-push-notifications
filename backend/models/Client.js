const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  clientName: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true,
    maxlength: [100, 'Client name cannot exceed 100 characters']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['active', 'inactive'],
      message: 'Status must be either active or inactive'
    },
    default: 'active'
  },
  brandLogoUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Allow empty string or valid URL
        if (!v) return true;
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Brand logo URL must be a valid HTTP/HTTPS URL'
    }
  },
  managedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Managed by user is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual for getting domains associated with this client
clientSchema.virtual('domains', {
  ref: 'Domain',
  localField: '_id',
  foreignField: 'clientId'
});

// Virtual for getting push subscriptions associated with this client
clientSchema.virtual('pushSubscriptions', {
  ref: 'PushSubscription',
  localField: '_id',
  foreignField: 'clientId'
});

// Virtual for getting notifications associated with this client
clientSchema.virtual('notifications', {
  ref: 'Notification',
  localField: '_id',
  foreignField: 'clientId'
});

// Ensure virtual fields are serialized
clientSchema.set('toJSON', { virtuals: true });
clientSchema.set('toObject', { virtuals: true });

// Index for better query performance
clientSchema.index({ managedBy: 1 });
clientSchema.index({ status: 1 });
clientSchema.index({ createdAt: -1 });

// Pre-remove middleware to clean up related documents
clientSchema.pre('remove', async function(next) {
  try {
    // Remove all related domains
    await mongoose.model('Domain').deleteMany({ clientId: this._id });
    
    // Remove all related push subscriptions
    await mongoose.model('PushSubscription').deleteMany({ clientId: this._id });
    
    // Remove all related notifications
    await mongoose.model('Notification').deleteMany({ clientId: this._id });
    
    // Remove all users associated with this client
    await mongoose.model('User').deleteMany({ clientId: this._id });
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Client', clientSchema);