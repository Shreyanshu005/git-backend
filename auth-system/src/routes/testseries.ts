// @ts-nocheck
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import type { Request } from 'express';
import type { File as MulterFile } from 'multer';

const router = Router();
const prisma = new PrismaClient();

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// GET all test series
router.get('/', async (_req, res) => {
  try {
    const testseries = await prisma.testSeries.findMany();
    res.json(testseries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test series' });
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
    res.status(201).json(testSeries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create test series' });
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
    const testSeries = await prisma.testSeries.update({
      where: { id },
      data: { title, subtitle, image, startDate, features, price, originalPrice, discount },
    });
    res.json({ success: true, testSeries });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update test series' });
  }
});

// DELETE a test series (admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    const testSeries = await prisma.testSeries.delete({
      where: { id },
    });
    res.json({ success: true, testSeries });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete test series' });
  }
});

// Image upload endpoint (admin only)
router.post('/upload-image', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const filePath = `/uploads/${file.filename}`;
    res.json({ success: true, path: filePath });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

export default router; 