const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Client = sequelize.define('Client', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  clientName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Client name is required'
      },
      len: {
        args: [1, 100],
        msg: 'Client name cannot exceed 100 characters'
      }
    },
    set(value) {
      this.setDataValue('clientName', value.trim());
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
    validate: {
      isIn: {
        args: [['active', 'inactive']],
        msg: 'Status must be either active or inactive'
      },
      notEmpty: {
        msg: 'Status is required'
      }
    }
  },
  brandLogoUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isUrl: {
        msg: 'Brand logo URL must be a valid HTTP/HTTPS URL'
      }
    },
    set(value) {
      if (value) {
        this.setDataValue('brandLogoUrl', value.trim());
      } else {
        this.setDataValue('brandLogoUrl', null);
      }
    }
  },
  managedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    validate: {
      notEmpty: {
        msg: 'Managed by user is required'
      }
    }
  }
}, {
  tableName: 'Clients',
  timestamps: true,
  indexes: [
    {
      fields: ['managedBy']
    },
    {
      fields: ['status']
    },
    {
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeDestroy: async (client, options) => {
      const { Domain, PushSubscription, Notification, User } = require('./index');
      
      // Remove all related domains
      await Domain.destroy({ where: { clientId: client.id }, transaction: options.transaction });
      
      // Remove all related push subscriptions
      await PushSubscription.destroy({ where: { clientId: client.id }, transaction: options.transaction });
      
      // Remove all related notifications
      await Notification.destroy({ where: { clientId: client.id }, transaction: options.transaction });
      
      // Remove all users associated with this client
      await User.destroy({ where: { clientId: client.id }, transaction: options.transaction });
    }
  }
});

module.exports = Client;