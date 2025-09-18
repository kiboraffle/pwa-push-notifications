const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
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
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Body is required'
      }
    },
    set(value) {
      this.setDataValue('body', value.trim());
    }
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true
  },
  url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sentAt: {
     type: DataTypes.DATE,
     allowNull: true,
     defaultValue: DataTypes.NOW
   }
}, {
  tableName: 'Notifications',
  timestamps: true,
  indexes: [
    {
      fields: ['domainId']
    },
    {
      fields: ['sentAt']
    }
  ],
  hooks: {
    beforeCreate: async (notification, options) => {
      const { Domain } = require('./index');
      
      const domain = await Domain.findByPk(notification.domainId, {
        transaction: options.transaction
      });
      
      if (!domain) {
        throw new Error('Domain not found');
      }
    },
    beforeUpdate: async (notification, options) => {
      if (notification.changed('domainId')) {
        const { Domain } = require('./index');
        
        const domain = await Domain.findByPk(notification.domainId, {
          transaction: options.transaction
        });
        
        if (!domain) {
          throw new Error('Domain not found');
        }
      }
    }
  }
});

// Static method to find notifications by domain
Notification.findByDomain = function(domainId, limit = 50) {
  return this.findAll({
    where: { domainId },
    include: [{
      model: require('./Domain'),
      as: 'domain'
    }],
    order: [['sentAt', 'DESC']],
    limit
  });
};

// Static method to get notification statistics for a domain
Notification.getDomainStats = async function(domainId, startDate, endDate) {
  const whereClause = { domainId };
  
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