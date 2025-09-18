const express = require('express');
const { sequelize } = require('../config/database');
const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    // Check database connection
    let dbStatus = 'disconnected';
    let dbName = 'unknown';
    
    try {
      await sequelize.authenticate();
      dbStatus = 'connected';
      dbName = sequelize.getDatabaseName();
    } catch (dbError) {
      console.error('Database connection failed:', dbError.message);
    }
    
    // Get basic system info
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        name: dbName
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
        unit: 'MB'
      },
      version: process.env.npm_package_version || '1.0.0'
    };
    
    // If database is disconnected, return 503
    if (dbStatus === 'disconnected') {
      return res.status(503).json({
        ...healthCheck,
        status: 'ERROR',
        message: 'Database connection failed'
      });
    }
    
    res.status(200).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// Detailed health check for monitoring systems
router.get('/detailed', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Test database with a simple query
    let dbResponseTime = null;
    if (dbStatus === 'connected') {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      dbResponseTime = Date.now() - start;
    }
    
    const detailedHealth = {
      status: dbStatus === 'connected' ? 'OK' : 'ERROR',
      timestamp: new Date().toISOString(),
      services: {
        api: {
          status: 'OK',
          uptime: process.uptime(),
          responseTime: '<1ms'
        },
        database: {
          status: dbStatus,
          responseTime: dbResponseTime ? `${dbResponseTime}ms` : 'N/A',
          host: mongoose.connection.host || 'unknown',
          name: mongoose.connection.name || 'unknown'
        }
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
          external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100,
          unit: 'MB'
        },
        cpu: {
          usage: process.cpuUsage()
        }
      }
    };
    
    const statusCode = dbStatus === 'connected' ? 200 : 503;
    res.status(statusCode).json(detailedHealth);
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      message: 'Detailed health check failed',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

module.exports = router;