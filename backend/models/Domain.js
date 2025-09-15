const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Domain = sequelize.define('Domain', {
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
  domainName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Domain name is required'
      },
      isDomain(value) {
        // Basic domain validation regex
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
        const localhostRegex = /^localhost(:[0-9]+)?$/;
        const ipRegex = /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(:[0-9]+)?$/;
        
        if (!domainRegex.test(value) && !localhostRegex.test(value) && !ipRegex.test(value)) {
          throw new Error('Please enter a valid domain name');
        }
      }
    },
    set(value) {
      this.setDataValue('domainName', value.toLowerCase().trim());
    }
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'Domains',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['clientId', 'domainName']
    },
    {
      fields: ['clientId']
    },
    {
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeCreate: async (domain, options) => {
      const { Client } = require('./index');
      
      const client = await Client.findByPk(domain.clientId, {
        transaction: options.transaction
      });
      
      if (!client) {
        throw new Error('Client not found');
      }
      
      if (client.status !== 'active') {
        throw new Error('Cannot add domain to inactive client');
      }
    },
    beforeUpdate: async (domain, options) => {
      if (domain.changed('clientId')) {
        const { Client } = require('./index');
        
        const client = await Client.findByPk(domain.clientId, {
          transaction: options.transaction
        });
        
        if (!client) {
          throw new Error('Client not found');
        }
        
        if (client.status !== 'active') {
          throw new Error('Cannot add domain to inactive client');
        }
      }
    }
  }
});

// Static method to find domains by client
Domain.findByClient = function(clientId) {
  return this.findAll({
    where: { clientId },
    include: [{
      model: require('./Client'),
      as: 'client'
    }]
  });
};

// Static method to verify domain ownership
Domain.verifyDomainOwnership = async function(domainName, clientId) {
  const domain = await this.findOne({
    where: {
      domainName: domainName.toLowerCase().trim(),
      clientId
    }
  });
  return !!domain;
};

module.exports = Domain;