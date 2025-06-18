import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Test database connection
prisma.$connect()
  .then(() => {
    console.log('Successfully connected to database');
  })
  .catch((error) => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }); 