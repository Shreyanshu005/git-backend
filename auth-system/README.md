# Mobile Number Authentication System

A complete authentication system using mobile number verification with OTP and PostgreSQL.

## Features

- Mobile number registration and verification
- OTP-based authentication
- No password required
- JWT token-based session management
- Socket.io authentication
- PostgreSQL database with Prisma ORM
- TypeScript support

## Prerequisites

- PostgreSQL (version 12 or higher)
- Node.js (version 14 or higher)

## Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE auth_system;
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# Database Configuration
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/auth_system?schema=public"

# Environment
NODE_ENV=development
```

4. Initialize Prisma and create database tables:
```bash
# Generate Prisma Client
npm run prisma:generate

# Create and apply database migrations
npm run prisma:migrate
```

5. Build the project:
```bash
npm run build
```

6. Start the server:
```bash
npm start
```

For development:
```bash
npm run dev
```

## Database Schema

The system uses Prisma ORM with the following schema:

```prisma
model User {
  id            String   @id @default(uuid())
  name          String   @db.VarChar(100)
  mobileNumber  String   @unique @db.VarChar(15)
  isVerified    Boolean  @default(false)
  version       Int      @default(0)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

## API Endpoints

### Public Routes

- `POST /api/auth/register` - Register a new user with mobile number
  ```json
  {
    "name": "John Doe",
    "mobileNumber": "1234567890"
  }
  ```

- `POST /api/auth/login` - Login with mobile number
  ```json
  {
    "mobileNumber": "1234567890"
  }
  ```

- `POST /api/auth/verify-otp` - Verify OTP
  ```json
  {
    "mobileNumber": "1234567890",
    "otp": "123456"
  }
  ```

- `POST /api/auth/resend-otp` - Resend verification OTP
  ```json
  {
    "mobileNumber": "1234567890"
  }
  ```

### Protected Routes

- `GET /api/auth/profile` - Get user profile (example protected route)

## Socket.io Authentication

To use socket authentication in your frontend:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  query: {
    token: 'your_jwt_token'
  }
});

socket.on('auth_error', (error) => {
  console.error('Authentication error:', error);
});
```

## Security Features

- JWT token expiration (24h for access token, 7d for refresh token)
- Token versioning to invalidate old sessions
- OTP expiration (10 minutes)
- Input validation for mobile numbers

## Production Considerations

1. Integrate with an SMS service provider (e.g., Twilio, MessageBird)
2. Use Redis or similar for OTP storage instead of in-memory Map
3. Implement rate limiting
4. Use HTTPS
5. Set secure cookie options
6. Implement proper error logging
7. Add request validation middleware
8. Set up proper CORS configuration
9. Use database migrations in production
10. Set up proper database indexes
11. Configure connection pooling
12. Set up database backups

## Database Management

Prisma provides several useful commands for database management:

```bash
# Generate Prisma Client
npm run prisma:generate

# Create and apply migrations
npm run prisma:migrate

# Open Prisma Studio (GUI for database management)
npm run prisma:studio
```

## SMS Integration

To integrate with an SMS service provider:

1. Choose an SMS service provider (e.g., Twilio, MessageBird)
2. Install their SDK
3. Update the `sendSMS` function in `src/controllers/otp.ts` with your provider's implementation
4. Add your provider's credentials to the `.env` file 