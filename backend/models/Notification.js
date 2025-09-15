const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
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
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Title is required'
      },
      len: {
        args: [1, 100],
        msg: 'Title cannot exceed 100 characters'
      }
    },
    set(value) {
      this.setDataValue('title', value.trim());
    }
  },
  content: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Content is required'
      },
      len: {
        args: [1, 500],
        msg: 'Content cannot exceed 500 characters'
      }
    },
    set(value) {
      this.setDataValue('content', value.trim());
    }
  },
  promoImageUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isUrl: {
        msg: 'Promo image URL must be a valid HTTP/HTTPS URL'
      }
    },
    set(value) {
      if (value) {
        this.setDataValue('promoImageUrl', value.trim());
      } else {
        this.setDataValue('promoImageUrl', null);
      }
    }
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed'),
    defaultValue: 'pending'
  },
  recipientCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  successCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  failureCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    set(value) {
      if (value) {
        this.setDataValue('errorMessage', value.trim());
      } else {
        this.setDataValue('errorMessage', null);
      }
    }
  }
}, {
  tableName: 'Notifications',
  timestamps: true,
  indexes: [
    {
      fields: ['clientId']
    },
    {
      fields: ['sentAt']
    },
    {
      fields: ['status']
    },
    {
      fields: ['clientId', 'sentAt']
    }
  ],
  hooks: {
    beforeCreate: async (notification, options) => {
      const { Client } = require('./index');
      
      const client = await Client.findByPk(notification.clientId, {
        transaction: options.transaction
      });
      
      if (!client) {
        throw new Error('Client not found');
      }
    },
    beforeUpdate: async (notification, options) => {
      if (notification.changed('clientId')) {
        const { Client } = require('./index');
        
        const client = await Client.findByPk(notification.clientId, {
          transaction: options.transaction
        });
        
        if (!client) {
          throw new Error('Client not found');
        }
      }
    }
  }
});

// Static method to find notifications by client
Notification.findByClient = function(clientId, limit = 50) {
  return this.findAll({
    where: { clientId },
    include: [{
      model: require('./Client'),
      as: 'client'
    }],
    order: [['sentAt', 'DESC']],
    limit
  });
};

// Static method to get notification statistics for a client
Notification.getClientStats = async function(clientId, startDate, endDate) {
  const whereClause = { clientId };
  
  if (startDate || endDate) {
    whereClause.sentAt = {};
    if (startDate) whereClause.sentAt[sequelize.Op.gte] = new Date(startDate);
    if (endDate) whereClause.sentAt[sequelize.Op.lte] = new Date(endDate);
  }
  
  return this.findAll({
    where: whereClause,
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('recipientCount')), 'totalRecipients'],
      [sequelize.fn('SUM', sequelize.col('successCount')), 'totalSuccess'],
      [sequelize.fn('SUM', sequelize.col('failureCount')), 'totalFailures']
    ],
    group: ['status'],
    raw: true
  });
};

// Instance method to mark notification as sent
Notification.prototype.markAsSent = function(recipientCount, successCount, failureCount) {
  this.status = 'sent';
  this.recipientCount = recipientCount || 0;
  this.successCount = successCount || 0;
  this.failureCount = failureCount || 0;
  this.sentAt = new Date();
  return this.save();
};

// Instance method to mark notification as failed
Notification.prototype.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  return this.save();
};

module.exports = Notification;