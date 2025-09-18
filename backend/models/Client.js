const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Client = sequelize.define('Client', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
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
      this.setDataValue('name', value.trim());
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'active'
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