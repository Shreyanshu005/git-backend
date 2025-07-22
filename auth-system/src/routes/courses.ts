// @ts-nocheck
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';
import { uploadToS3, deleteFromS3, generatePresignedUploadUrl, generatePresignedUrl } from '../utils/s3';

const router = Router();
const prisma = new PrismaClient();

// GET all courses
router.get('/', async (_req, res) => {
  try {
    const courses = await prisma.course.findMany();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Sorry, we could not load the courses. Please try again later.' });
  }
});

// NEW: Get all courses purchased by the current user
router.get('/purchased', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('Fetching purchased courses for user:', userId); // Logging user ID

    const purchases = await prisma.coursePurchase.findMany({
      where: { userId, status: 'active' },
      include: { course: true },
    });
    console.log('Found course purchases:', purchases); // Logging DB query result

    const courses = purchases.filter(p => p.course).map((p) => p.course);
    console.log('Returning courses:', courses); // Logging final course list
    
    res.json({ courses });
  } catch (error) {
    console.error('Error fetching purchased courses:', error); // Enhanced error logging
    res.status(500).json({ error: 'Sorry, we could not load your purchased courses. Please try again later.' });
  }
});

// GET a single course by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { id },
    });
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Sorry, we could not load the course. Please try again later.' });
  }
});

// NEW: Check if the current user has purchased a specific course
router.get('/:id/purchased', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.id;
    const purchase = await prisma.coursePurchase.findFirst({
      where: { userId, courseId, status: 'active' },
    });
    res.json({ purchased: !!purchase });
  } catch (error) {
    res.status(500).json({ error: 'Sorry, we could not check your purchase status. Please try again later.' });
  }
});

// NEW: Mark a course as purchased for the current user
router.post('/:id/purchase', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.id;
    // Optionally: verify payment here
    const existing = await prisma.coursePurchase.findFirst({ where: { userId, courseId, status: 'active' } });
    if (existing) return res.status(200).json({ success: true, message: 'You have already purchased this course.' });
    await prisma.coursePurchase.create({
      data: { userId, courseId, status: 'active' },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Sorry, we could not mark this course as purchased. Please try again.' });
  }
});

// POST create a new course (admin only, with image URL)
router.post('/', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    const { title, subtitle, image, startDate, price, originalPrice, discount } = req.body;
    let { features } = req.body;
    // Normalize features to array
    if (typeof features === 'string') {
      features = features.split(',').map(f => f.trim()).filter(f => f);
    } else if (Array.isArray(features)) {
      features = features.map(f => f.trim()).filter(f => f);
    } else {
      features = [];
    }
    if (!title || !subtitle || !image || typeof image !== 'string' || (!image.startsWith('http') && !image.startsWith('course-thumbnails/')) || !startDate || !features.length || !price || !originalPrice || !discount) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }
    const course = await prisma.course.create({
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
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ error: 'Sorry, we could not create the course. Please try again.' });
  }
});

// DELETE a course (admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    const { id } = req.params;
    
    // Get course to delete image from S3
    const course = await prisma.course.findUnique({ where: { id } });
    if (course && course.image) {
      try {
        await deleteFromS3(course.image);
      } catch (s3Error) {
        console.error('S3 delete error:', s3Error);
        // Continue with database deletion even if S3 delete fails
      }
    }
    
    await prisma.course.delete({ where: { id } });
    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ error: 'Sorry, we could not delete the course. Please try again.' });
  }
});

// UPDATE a course (admin only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    const { id } = req.params;
    const { title, subtitle, image, startDate, features, price, originalPrice, discount } = req.body;
    
    // If image is being updated, delete old image from S3
    if (image) {
      const existingCourse = await prisma.course.findUnique({ where: { id } });
      if (existingCourse && existingCourse.image && existingCourse.image !== image) {
        try {
          await deleteFromS3(existingCourse.image);
        } catch (s3Error) {
          console.error('S3 delete error:', s3Error);
        }
      }
    }
    
    const course = await prisma.course.update({
      where: { id },
      data: { title, subtitle, image, startDate, features, price, originalPrice, discount },
    });
    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ error: 'Sorry, we could not update the course. Please try again.' });
  }
});

// Image upload endpoint (admin only)
router.post('/upload-image', authenticate, uploadToS3('course-thumbnails').single('image'), async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    const file = req.file as any;
    if (!file) {
      return res.status(400).json({ error: 'Please select a file to upload.' });
    }
    // Return the S3 URL
    res.json({ success: true, path: file.location, message: 'Image uploaded successfully.' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Sorry, we could not upload the image. Please try again.' });
  }
});

// Generate a presigned S3 upload URL for course thumbnails
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
    const key = `course-thumbnails/${uniqueSuffix}-${fileName}`;
    const url = await generatePresignedUploadUrl(key, contentType);
    res.json({ url, key });
  } catch (error) {
    console.error('Error generating presigned upload URL:', error);
    res.status(500).json({ error: 'Sorry, we could not generate an upload link. Please try again.' });
  }
});

// GET /api/courses/:id/image-url - returns a presigned S3 GET URL for the course image
router.get('/:id/image-url', async (req, res) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course || !course.image) return res.status(404).json({ error: 'The requested course or image was not found.' });
    // course.image is the S3 key
    const url = await generatePresignedUrl(course.image, 300); // 5 minutes
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: 'Sorry, we could not generate the image link. Please try again.' });
  }
});

export default router; 