// @ts-nocheck
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';
import { uploadToS3, deleteFromS3, generatePresignedUploadUrl, generatePresignedUrl } from '../utils/s3';

const router = Router();
const prisma = new PrismaClient();

// GET all test series
router.get('/', async (_req, res) => {
  try {
    const testseries = await prisma.testSeries.findMany();
    res.json(testseries);
  } catch (error) {
    res.status(500).json({ error: 'Sorry, we could not load the test series. Please try again later.' });
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
    res.status(500).json({ error: 'Sorry, we could not load your purchased test series. Please try again later.' });
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
    res.status(500).json({ error: 'Sorry, we could not check your purchase status. Please try again later.' });
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
      return res.status(200).json({ success: true, message: 'You have already purchased this test series.' });
    }

    console.log('Creating new test series purchase...');
    const purchase = await prisma.testSeriesPurchase.create({
      data: { userId, testSeriesId, status: 'active' },
    });
    console.log('Test series purchase created:', purchase);
    res.json({ success: true, purchase });
  } catch (error) {
    console.error('Error creating test series purchase:', error);
    res.status(500).json({ error: 'Sorry, we could not mark this test series as purchased. Please try again.' });
  }
});

// POST create a new test series (admin only, with image URL)
router.post('/', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    const { title, subtitle, image, startDate, features, price, originalPrice, discount } = req.body;
    if (!title || !subtitle || !image || typeof image !== 'string' || (!image.startsWith('http') && !image.startsWith('testseries-thumbnails/')) || !startDate || !features || !price || !originalPrice || !discount) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }
    const testSeries = await prisma.testSeries.create({
      data: {
        title,
        subtitle,
        image,
        startDate,
        features,
        price,
        originalPrice,
        discount,
      }
    });
    res.status(201).json(testSeries);
  } catch (error) {
    res.status(500).json({ error: 'Sorry, we could not create the test series. Please try again.' });
  }
});

// PUT update a test series (admin only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    const { id } = req.params;
    const { title, subtitle, image, startDate, features, price, originalPrice, discount } = req.body;
    // If image is being updated, delete old image from S3
    if (image) {
      const existingTestSeries = await prisma.testSeries.findUnique({ where: { id } });
      if (existingTestSeries && existingTestSeries.image && existingTestSeries.image !== image) {
        try {
          await deleteFromS3(existingTestSeries.image);
        } catch (s3Error) {
          console.error('S3 delete error:', s3Error);
        }
      }
    }
    const testSeries = await prisma.testSeries.update({
      where: { id },
      data: { title, subtitle, image, startDate, features, price, originalPrice, discount },
    });
    return res.json({ success: true, testSeries });
  } catch (error) {
    return res.status(500).json({ error: 'Sorry, we could not update the test series. Please try again.' });
  }
});

// DELETE a test series (admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    const { id } = req.params;
    // Get test series to delete image from S3
    const testSeries = await prisma.testSeries.findUnique({ where: { id } });
    if (testSeries && testSeries.image) {
      try {
        await deleteFromS3(testSeries.image);
      } catch (s3Error) {
        console.error('S3 delete error:', s3Error);
        // Continue with database deletion even if S3 delete fails
      }
    }
    await prisma.testSeries.delete({ where: { id } });
    return res.json({ success: true, testSeries });
  } catch (error) {
    return res.status(500).json({ error: 'Sorry, we could not delete the test series. Please try again.' });
  }
});

// Image upload endpoint (admin only)
router.post('/upload-image', authenticate, uploadToS3('testseries-thumbnails').single('image'), async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    const file = req.file as any;
    if (!file) {
      return res.status(400).json({ error: 'Please select a file to upload.' });
    }
    // Return the S3 URL
    return res.json({ success: true, path: file.location, message: 'Image uploaded successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Sorry, we could not upload the image. Please try again.' });
  }
});

// Generate a presigned S3 upload URL for test series thumbnails
router.post('/presigned-upload', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    const { fileName, contentType } = req.body;
    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'Please provide both file name and content type.' });
    }
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const key = `testseries-thumbnails/${uniqueSuffix}-${fileName}`;
    const url = await generatePresignedUploadUrl(key, contentType);
    res.json({ url, key });
  } catch (error) {
    console.error('Error generating presigned upload URL:', error);
    res.status(500).json({ error: 'Sorry, we could not generate an upload link. Please try again.' });
  }
});

// GET /api/testseries/:id/image-url - returns a presigned S3 GET URL for the test series image
router.get('/:id/image-url', async (req, res) => {
  try {
    const testSeries = await prisma.testSeries.findUnique({ where: { id: req.params.id } });
    if (!testSeries || !testSeries.image) return res.status(404).json({ error: 'The requested test series or image was not found.' });
    // testSeries.image is the S3 key
    const url = await generatePresignedUrl(testSeries.image, 300); // 5 minutes
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: 'Sorry, we could not generate the image link. Please try again.' });
  }
});

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
    res.status(500).json({ error: 'Sorry, we could not create the test purchase. Please try again.' });
  }
});

export default router; 