// @ts-nocheck
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';
// import { uploadToS3, deleteFromS3 } from '../utils/s3';

const router = Router();
const prisma = new PrismaClient();

// GET all test series
router.get('/', async (_req, res) => {
  try {
    const testseries = await prisma.testSeries.findMany();
    res.json(testseries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test series' });
  }
});

// NEW: Get all test series purchased by the current user
router.get('/purchased', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching purchased test series for user:', userId);

    const purchases = await prisma.testSeriesPurchase.findMany({
      where: { userId, status: 'active' },
      include: { testSeries: true },
    });
    console.log('Found purchases:', purchases);

    const testSeries = purchases.map((p) => p.testSeries);
    console.log('Returning test series:', testSeries);
    res.json({ testSeries });
  } catch (error) {
    console.error('Error fetching purchased test series:', error);
    res.status(500).json({ error: 'Failed to fetch purchased test series' });
  }
});

// NEW: Check if the current user has purchased a specific test series
router.get('/:id/purchased', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const testSeriesId = req.params.id;
    const purchase = await prisma.testSeriesPurchase.findFirst({
      where: { userId, testSeriesId, status: 'active' },
    });
    res.json({ purchased: !!purchase });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check purchase status' });
  }
});

// NEW: Mark a test series as purchased for the current user
router.post('/:id/purchase', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const testSeriesId = req.params.id;
    console.log('Manual test series purchase attempt:', { userId, testSeriesId });

    // Optionally: verify payment here
    const existing = await prisma.testSeriesPurchase.findFirst({ where: { userId, testSeriesId, status: 'active' } });
    if (existing) {
      console.log('Test series already purchased');
      return res.status(200).json({ success: true, message: 'Already purchased' });
    }

    console.log('Creating new test series purchase...');
    const purchase = await prisma.testSeriesPurchase.create({
      data: { userId, testSeriesId, status: 'active' },
    });
    console.log('Test series purchase created:', purchase);
    res.json({ success: true, purchase });
  } catch (error) {
    console.error('Error creating test series purchase:', error);
    res.status(500).json({ error: 'Failed to mark as purchased' });
  }
});

// POST create a new test series (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { title, subtitle, image, startDate, features, price, originalPrice, discount } = req.body;
    if (!title || !subtitle || !image || !startDate || !features || !price || !originalPrice || !discount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const testSeries = await prisma.testSeries.create({
      data: { title, subtitle, image, startDate, features, price, originalPrice, discount }
    });
    return res.status(201).json(testSeries);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create test series' });
  }
});

// PUT update a test series (admin only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    const { title, subtitle, image, startDate, features, price, originalPrice, discount } = req.body;
    // If image is being updated, delete old image from S3
    // if (image) {
    //   const existingTestSeries = await prisma.testSeries.findUnique({ where: { id } });
    //   if (existingTestSeries && existingTestSeries.image && existingTestSeries.image !== image) {
    //     try {
    //       await deleteFromS3(existingTestSeries.image);
    //     } catch (s3Error) {
    //       console.error('S3 delete error:', s3Error);
    //     }
    //   }
    // }
    const testSeries = await prisma.testSeries.update({
      where: { id },
      data: { title, subtitle, image, startDate, features, price, originalPrice, discount },
    });
    return res.json({ success: true, testSeries });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update test series' });
  }
});

// DELETE a test series (admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    // Get test series to delete image from S3
    const testSeries = await prisma.testSeries.findUnique({ where: { id } });
    // if (testSeries && testSeries.image) {
    //   try {
    //     await deleteFromS3(testSeries.image);
    //   } catch (s3Error) {
    //     console.error('S3 delete error:', s3Error);
    //     // Continue with database deletion even if S3 delete fails
    //   }
    // }
    await prisma.testSeries.delete({ where: { id } });
    return res.json({ success: true, testSeries });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete test series' });
  }
});

// Image upload endpoint (admin only) - TEMPORARILY DISABLED
// router.post('/upload-image', authenticate, uploadToS3('testseries-thumbnails').single('image'), async (req, res) => {
//   try {
//     if (!req.user || !req.user.isAdmin) {
//       return res.status(403).json({ error: 'Admin access required' });
//     }
//     const file = req.file as any;
//     if (!file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }
//     // Return the S3 URL
//     return res.json({ success: true, path: file.location });
//   } catch (error) {
//     return res.status(500).json({ error: 'Failed to upload image' });
//   }
// });

// TEST: Manual test endpoint for debugging
router.post('/test-purchase/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const testSeriesId = req.params.id;
    
    console.log('Manual test purchase for:', { userId, testSeriesId });
    
    // Check if already purchased
    const existing = await prisma.testSeriesPurchase.findFirst({
      where: { userId, testSeriesId, status: 'active' }
    });
    
    if (existing) {
      return res.json({ success: true, message: 'Already purchased', purchase: existing });
    }
    
    // Create purchase
    const purchase = await prisma.testSeriesPurchase.create({
      data: { userId, testSeriesId, status: 'active' },
      include: { testSeries: true }
    });
    
    console.log('Test purchase created:', purchase);
    res.json({ success: true, purchase });
  } catch (error) {
    console.error('Test purchase error:', error);
    res.status(500).json({ error: 'Failed to create test purchase' });
  }
});

export default router; 