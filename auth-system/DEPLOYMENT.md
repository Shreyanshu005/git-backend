# Deployment Guide

This guide covers deploying the auth-system to different platforms.

## Prerequisites

- Node.js 18+ installed
- Database URL configured
- Environment variables set up

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="your-database-url"

# JWT Secret
JWT_SECRET="your-jwt-secret"

# 2Factor API (for SMS)
TWO_FACTOR_API_KEY="your-2factor-api-key"

# Port (optional, defaults to 3000)
PORT=3000
```

## Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

## Production Build

```bash
# Install dependencies
npm install

# Build for production
npm run build:prod

# Start production server
npm start
```

## Deployment Options

### 1. Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Use the following settings:
   - **Build Command**: `npm install && npm run build:prod`
   - **Start Command**: `npm start`
   - **Environment**: Node

4. Set environment variables in Render dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `TWO_FACTOR_API_KEY`
   - `NODE_ENV=production`

### 2. Docker

```bash
# Build the Docker image
docker build -t auth-system .

# Run the container
docker run -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e JWT_SECRET="your-jwt-secret" \
  -e TWO_FACTOR_API_KEY="your-2factor-api-key" \
  auth-system
```

### 3. Railway

1. Connect your GitHub repository to Railway
2. Railway will automatically detect the Node.js project
3. Set environment variables in Railway dashboard
4. Deploy

### 4. Heroku

1. Create a Heroku app
2. Connect your GitHub repository
3. Set environment variables:
   ```bash
   heroku config:set DATABASE_URL="your-database-url"
   heroku config:set JWT_SECRET="your-jwt-secret"
   heroku config:set TWO_FACTOR_API_KEY="your-2factor-api-key"
   heroku config:set NODE_ENV=production
   ```
4. Deploy

## Database Setup

### PostgreSQL (Recommended)

1. Create a PostgreSQL database
2. Update your `DATABASE_URL`
3. Run migrations:
   ```bash
   npm run prisma:migrate
   ```

### SQLite (Development)

For local development, you can use SQLite:

```env
DATABASE_URL="file:./dev.db"
```

## Troubleshooting

### Build Errors

If you encounter build errors:

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Regenerate Prisma client:
   ```bash
   npm run prisma:generate
   ```

3. Rebuild:
   ```bash
   npm run build
   ```

### Module Not Found Errors

If you get "Cannot find module" errors:

1. Ensure the build completed successfully
2. Check that `dist/index.js` exists
3. Verify all dependencies are installed
4. Run `npm run build:prod` to ensure proper build

### Database Connection Issues

1. Verify your `DATABASE_URL` is correct
2. Ensure the database is accessible
3. Run `npm run prisma:migrate` to set up tables
4. Check database credentials and permissions

## Health Check

The API includes a health check endpoint:

```
GET /api/health
```

This should return a 200 status when the service is running properly. 