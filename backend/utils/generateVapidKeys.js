const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

/**
 * Generate VAPID keys for web push notifications
 * Run this script once to generate keys and update your .env file
 */
function generateVapidKeys() {
  console.log('Generating VAPID keys for web push notifications...');
  
  try {
    // Generate VAPID keys
    const vapidKeys = webpush.generateVAPIDKeys();
    
    console.log('\n=== VAPID Keys Generated Successfully ===');
    console.log('\nPublic Key:');
    console.log(vapidKeys.publicKey);
    console.log('\nPrivate Key:');
    console.log(vapidKeys.privateKey);
    
    // Create .env content
    const envContent = `
# VAPID Keys for Web Push Notifications
# Generated on ${new Date().toISOString()}
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_EMAIL=mailto:admin@yourapp.com
`;
    
    // Check if .env file exists
    const envPath = path.join(__dirname, '..', '.env');
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    
    if (fs.existsSync(envPath)) {
      // Read existing .env file
      let existingEnv = fs.readFileSync(envPath, 'utf8');
      
      // Check if VAPID keys already exist
      if (existingEnv.includes('VAPID_PUBLIC_KEY')) {
        console.log('\n⚠️  VAPID keys already exist in .env file.');
        console.log('If you want to replace them, please update manually or delete the existing keys first.');
      } else {
        // Append VAPID keys to existing .env file
        fs.appendFileSync(envPath, envContent);
        console.log('\n✅ VAPID keys have been added to your .env file.');
      }
    } else {
      // Create new .env file with VAPID keys
      const fullEnvContent = `# PWA Push Notifications Environment Variables
# Copy from .env.example and update with your values

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/pwa_push_notifications

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Security
BCRYPT_SALT_ROUNDS=12${envContent}`;
      
      fs.writeFileSync(envPath, fullEnvContent);
      console.log('\n✅ .env file created with VAPID keys.');
    }
    
    // Update .env.example file
    if (fs.existsSync(envExamplePath)) {
      let envExample = fs.readFileSync(envExamplePath, 'utf8');
      
      if (!envExample.includes('VAPID_PUBLIC_KEY')) {
        const exampleVapidContent = `
# Web Push Configuration
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:your-email@example.com`;
        
        fs.appendFileSync(envExamplePath, exampleVapidContent);
        console.log('✅ .env.example file updated with VAPID key placeholders.');
      }
    }
    
    console.log('\n=== Next Steps ===');
    console.log('1. Make sure your .env file contains the VAPID keys above');
    console.log('2. Update VAPID_EMAIL with your actual email address');
    console.log('3. Restart your server to load the new environment variables');
    console.log('4. Test push notifications from your client admin panel');
    console.log('\n=== Security Note ===');
    console.log('⚠️  Keep your VAPID private key secret!');
    console.log('⚠️  Never commit your .env file to version control!');
    console.log('⚠️  The public key can be safely shared with client websites.');
    
  } catch (error) {
    console.error('Error generating VAPID keys:', error);
    process.exit(1);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  generateVapidKeys();
}

module.exports = { generateVapidKeys };