const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Client = require('./Client');
const Domain = require('./Domain');
const Notification = require('./Notification');
const PushSubscription = require('./PushSubscription');

// Define associations

// User associations
User.belongsTo(Client, {
  foreignKey: 'clientId',
  as: 'client',
  allowNull: true
});

// Client associations
Client.hasMany(User, {
  foreignKey: 'clientId',
  as: 'users'
});

Client.hasMany(Domain, {
  foreignKey: 'clientId',
  as: 'domains'
});

Client.hasMany(Notification, {
  foreignKey: 'clientId',
  as: 'notifications'
});

Client.hasMany(PushSubscription, {
  foreignKey: 'clientId',
  as: 'pushSubscriptions'
});

Client.belongsTo(User, {
  foreignKey: 'managedBy',
  as: 'manager'
});

// Domain associations
Domain.belongsTo(Client, {
  foreignKey: 'clientId',
  as: 'client'
});

// Notification associations
Notification.belongsTo(Client, {
  foreignKey: 'clientId',
  as: 'client'
});

// PushSubscription associations
PushSubscription.belongsTo(Client, {
  foreignKey: 'clientId',
  as: 'client'
});

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  Client,
  Domain,
  Notification,
  PushSubscription
};