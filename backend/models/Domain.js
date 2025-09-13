const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client ID is required']
  },
  domainName: {
    type: String,
    required: [true, 'Domain name is required'],
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        // Basic domain validation regex
        return /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/.test(v) || 
               /^localhost(:[0-9]+)?$/.test(v) ||
               /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(:[0-9]+)?$/.test(v);
      },
      message: 'Please enter a valid domain name'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure unique domain per client
domainSchema.index({ clientId: 1, domainName: 1 }, { unique: true });

// Index for better query performance
domainSchema.index({ clientId: 1 });
domainSchema.index({ createdAt: -1 });

// Virtual to populate client information
domainSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
domainSchema.set('toJSON', { virtuals: true });
domainSchema.set('toObject', { virtuals: true });

// Pre-save middleware to validate client exists and is active
domainSchema.pre('save', async function(next) {
  try {
    const Client = mongoose.model('Client');
    const client = await Client.findById(this.clientId);
    
    if (!client) {
      return next(new Error('Client not found'));
    }
    
    if (client.status !== 'active') {
      return next(new Error('Cannot add domain to inactive client'));
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to find domains by client
domainSchema.statics.findByClient = function(clientId) {
  return this.find({ clientId }).populate('client');
};

// Static method to verify domain ownership
domainSchema.statics.verifyDomainOwnership = async function(domainName, clientId) {
  const domain = await this.findOne({ domainName, clientId });
  return !!domain;
};

module.exports = mongoose.model('Domain', domainSchema);