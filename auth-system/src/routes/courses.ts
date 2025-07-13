// @ts-nocheck
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';
// import { uploadToS3, deleteFromS3 } from '../utils/s3';

const router = Router();
const prisma = new PrismaClient();

// GET all courses
router.get('/', async (_req, res) => {
  try {
    const courses = await prisma.course.findMany();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// NEW: Get all courses purchased by the current user
router.get('/purchased', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const purchases = await prisma.coursePurchase.findMany({
      where: { userId, status: 'active' },
      include: { course: true },
    });
    const courses = purchases.map((p) => p.course);
    res.json({ courses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchased courses' });
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
    res.status(500).json({ error: 'Failed to check purchase status' });
  }
});

// NEW: Mark a course as purchased for the current user
router.post('/:id/purchase', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.id;
    // Optionally: verify payment here
    const existing = await prisma.coursePurchase.findFirst({ where: { userId, courseId, status: 'active' } });
    if (existing) return res.status(200).json({ success: true, message: 'Already purchased' });
    await prisma.coursePurchase.create({
      data: { userId, courseId, status: 'active' },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as purchased' });
  }
});

// POST create a new course (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    console.log('req.user:', req.user);
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { title, subtitle, image, startDate, features, price, originalPrice, discount } = req.body;
    if (!title || !subtitle || !image || !startDate || !features || !price || !originalPrice || !discount) {
      return res.status(400).json({ error: 'Missing required fields' });
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
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// DELETE a course (admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    
    // Get course to delete image from S3
    const course = await prisma.course.findUnique({ where: { id } });
    // if (course && course.image) {
    //   try {
    //     await deleteFromS3(course.image);
    //   } catch (s3Error) {
    //     console.error('S3 delete error:', s3Error);
    //     // Continue with database deletion even if S3 delete fails
    //   }
    // }
    
    await prisma.course.delete({ where: { id } });
    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// UPDATE a course (admin only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    const { title, subtitle, image, startDate, features, price, originalPrice, discount } = req.body;
    
    // If image is being updated, delete old image from S3
    // if (image) {
    //   const existingCourse = await prisma.course.findUnique({ where: { id } });
    //   if (existingCourse && existingCourse.image && existingCourse.image !== image) {
    //     try {
    //       await deleteFromS3(existingCourse.image);
    //     } catch (s3Error) {
    //       console.error('S3 delete error:', s3Error);
    //     }
    //   }
    // }
    
    const course = await prisma.course.update({
      where: { id },
      data: { title, subtitle, image, startDate, features, price, originalPrice, discount },
    });
    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Image upload endpoint (admin only) - TEMPORARILY DISABLED
// router.post('/upload-image', authenticate, uploadToS3('course-thumbnails').single('image'), async (req, res) => {
//   try {
//     if (!req.user || !req.user.isAdmin) {
//       return res.status(403).json({ error: 'Admin access required' });
//     }
    
//     const file = req.file as any;
//     if (!file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }
    
//     // Return the S3 URL
//     res.json({ success: true, path: file.location });
//   } catch (error) {
//     console.error('Upload error:', error);
//     res.status(500).json({ error: 'Failed to upload image' });
//   }
// });

export default router; 