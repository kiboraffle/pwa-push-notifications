const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PushSubscription = sequelize.define('PushSubscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Clients',
      key: 'id'
    },
    validate: {
      notEmpty: {
        msg: 'Client ID is required'
      }
    }
  },
  subscription: {
    type: DataTypes.JSONB,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Subscription object is required'
      },
      isValidSubscription(value) {
        // Validate that subscription has required properties for web push
        if (!value || 
            typeof value.endpoint !== 'string' || 
            !value.keys || 
            typeof value.keys.p256dh !== 'string' || 
            typeof value.keys.auth !== 'string') {
          throw new Error('Subscription must contain endpoint and keys (p256dh, auth)');
        }
      }
    }
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {
      domain: 'unknown',
      userAgent: 'unknown',
      subscribedAt: new Date()
    }
  }
}, {
  tableName: 'PushSubscriptions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['clientId', [sequelize.literal("(subscription->>'endpoint')"), 'endpoint']]
    },
    {
      fields: ['clientId']
    },
    {
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeCreate: async (subscription, options) => {
      const { Client } = require('./index');
      
      const client = await Client.findByPk(subscription.clientId, {
        transaction: options.transaction
      });
      
      if (!client) {
        throw new Error('Client not found');
      }
      
      if (client.status !== 'active') {
        throw new Error('Cannot add subscription to inactive client');
      }
      
      // Set subscribedAt in metadata if not provided
      if (!subscription.metadata) {
        subscription.metadata = {};
      }
      if (!subscription.metadata.subscribedAt) {
        subscription.metadata.subscribedAt = new Date();
      }
    },
    beforeUpdate: async (subscription, options) => {
      if (subscription.changed('clientId')) {
        const { Client } = require('./index');
        
        const client = await Client.findByPk(subscription.clientId, {
          transaction: options.transaction
        });
        
        if (!client) {
          throw new Error('Client not found');
        }
        
        if (client.status !== 'active') {
          throw new Error('Cannot add subscription to inactive client');
        }
      }
    }
  }
});

// Static method to find subscriptions by client
PushSubscription.findByClient = function(clientId) {
  return this.findAll({
    where: { clientId },
    include: [{
      model: require('./Client'),
      as: 'client'
    }]
  });
};

// Static method to find active subscriptions by client
PushSubscription.findActiveByClient = async function(clientId) {
  const { Client } = require('./index');
  
  return this.findAll({
    where: { clientId },
    include: [{
      model: Client,
      as: 'client',
      where: { status: 'active' },
      required: true
    }]
  });
};

// Static method to remove subscription by endpoint
PushSubscription.removeByEndpoint = function(endpoint, clientId) {
  return this.destroy({
    where: {
      clientId,
      [sequelize.Op.and]: [
        sequelize.where(
          sequelize.literal("subscription->>'endpoint'"),
          endpoint
        )
      ]
    }
  });
};

// Instance method to check if subscription is valid
PushSubscription.prototype.isValid = function() {
  const subscription = this.subscription;
  return subscription && 
         subscription.endpoint && 
         subscription.keys && 
         subscription.keys.p256dh && 
         subscription.keys.auth;
};

module.exports = PushSubscription;