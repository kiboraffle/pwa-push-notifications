const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PushSubscription = sequelize.define('PushSubscription', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  domainId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Domains',
      key: 'id'
    },
    validate: {
      notEmpty: {
        msg: 'Domain ID is required'
      }
    }
  },
  endpoint: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Endpoint is required'
      }
    }
  },
  p256dh: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'p256dh key is required'
      }
    }
  },
  auth: {
     type: DataTypes.TEXT,
     allowNull: false,
     validate: {
       notEmpty: {
         msg: 'Auth key is required'
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
      fields: ['domainId', 'endpoint']
    },
    {
      fields: ['domainId']
    },
    {
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeCreate: async (subscription, options) => {
      const { Domain } = require('./index');
      
      const domain = await Domain.findByPk(subscription.domainId, {
        transaction: options.transaction
      });
      
      if (!domain) {
        throw new Error('Domain not found');
      }
      
      if (domain.status !== 'active') {
        throw new Error('Cannot add subscription to inactive domain');
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
      if (subscription.changed('domainId')) {
        const { Domain } = require('./index');
        
        const domain = await Domain.findByPk(subscription.domainId, {
          transaction: options.transaction
        });
        
        if (!domain) {
          throw new Error('Domain not found');
        }
        
        if (domain.status !== 'active') {
          throw new Error('Cannot add subscription to inactive domain');
        }
      }
    }
  }
});

// Static method to find subscriptions by domain
PushSubscription.findByDomain = function(domainId) {
  return this.findAll({
    where: { domainId },
    include: [{
      model: require('./Domain'),
      as: 'domain'
    }]
  });
};

// Static method to find active subscriptions by domain
PushSubscription.findActiveByDomain = async function(domainId) {
  const { Domain } = require('./index');
  
  return this.findAll({
    where: { domainId },
    include: [{
      model: Domain,
      as: 'domain',
      where: { status: 'active' },
      required: true
    }]
  });
};

// Static method to remove subscription by endpoint
PushSubscription.removeByEndpoint = function(endpoint, domainId) {
  return this.destroy({
    where: {
      domainId,
      endpoint
    }
  });
};

// Instance method to check if subscription is valid
PushSubscription.prototype.isValid = function() {
  return this.endpoint && 
         this.p256dh && 
         this.auth;
};

module.exports = PushSubscription;