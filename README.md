# PWA Push Notifications - Multi-Tenant System

A complete Progressive Web App (PWA) for managing multi-tenant web push notifications with React.js frontend and Node.js backend.

## Technology Stack

- **Frontend**: React.js with Material-UI
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Push Notifications**: Web Push API

## Project Structure

```
kibo508/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection configuration
│   ├── models/
│   │   ├── User.js              # User model with authentication
│   │   ├── Client.js            # Client/tenant model
│   │   ├── Domain.js            # Domain management model
│   │   ├── PushSubscription.js  # Push subscription model
│   │   ├── Notification.js      # Notification logging model
│   │   └── index.js             # Models export file
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   └── health.js            # Health check routes
│   ├── utils/
│   │   └── auth.js              # JWT utilities and middleware
│   ├── .env.example             # Environment variables template
│   ├── package.json             # Backend dependencies
│   └── server.js                # Express server setup
├── frontend/
│   └── package.json             # Frontend dependencies
└── README.md                    # This file
```

## Database Schema

### Users Collection
- `email`: Unique user email (required)
- `password`: Hashed password (required)
- `role`: User role - 'master' or 'client' (required)
- `clientId`: Reference to client (required for client role)
- `createdAt`: Creation timestamp

### Clients Collection
- `clientName`: Client/tenant name (required)
- `status`: 'active' or 'inactive' (default: 'active')
- `brandLogoUrl`: Optional brand logo URL
- `managedBy`: Reference to managing user (required)
- `createdAt`: Creation timestamp

### Domains Collection
- `clientId`: Reference to client (required)
- `domainName`: Domain name (required)
- `createdAt`: Creation timestamp

### Push Subscriptions Collection
- `clientId`: Reference to client (required)
- `subscription`: Web push subscription object (required)
- `createdAt`: Creation timestamp

### Notifications Collection
- `clientId`: Reference to client (required)
- `title`: Notification title (required)
- `content`: Notification content (required)
- `promoImageUrl`: Optional promotional image URL
- `sentAt`: Timestamp when sent
- `status`: 'pending', 'sent', or 'failed'
- `recipientCount`: Number of recipients
- `successCount`: Successful deliveries
- `failureCount`: Failed deliveries

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure environment variables in `.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/pwa_push_notifications
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   FRONTEND_URL=http://localhost:3000
   VAPID_PUBLIC_KEY=your_vapid_public_key
   VAPID_PRIVATE_KEY=your_vapid_private_key
   VAPID_EMAIL=mailto:your-email@example.com
   BCRYPT_SALT_ROUNDS=12
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## API Endpoints

### Health Check
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system health

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (authenticated)
- `POST /api/auth/verify` - Verify JWT token

## Features

### Multi-Tenant Architecture
- Separate client spaces with isolated data
- Role-based access control (master/client)
- Client-specific domain management

### Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers

### Database Features
- Mongoose ODM with schema validation
- Indexed collections for performance
- Referential integrity with population
- Automatic timestamp management

### Push Notification Support
- Web Push API integration
- Subscription management
- Notification logging and analytics
- VAPID key configuration

## Development

### Running in Development Mode

1. Start MongoDB service
2. Start backend server: `cd backend && npm run dev`
3. Start frontend server: `cd frontend && npm start`

### Environment Variables

Copy `.env.example` to `.env` and configure:
- Database connection string
- JWT secret key
- VAPID keys for push notifications
- CORS origins

## Next Steps

This foundation provides:
- ✅ Complete backend API structure
- ✅ Database models and relationships
- ✅ Authentication system
- ✅ Health monitoring
- ✅ Security middleware

To complete the application:
1. Implement remaining API routes (clients, domains, notifications)
2. Build React frontend components
3. Add PWA configuration (service worker, manifest)
4. Implement push notification functionality
5. Add admin dashboard and client portal

## License

ISC License