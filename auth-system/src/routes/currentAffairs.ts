import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// Ensure uploads/current-affairs directory exists
const uploadDir = path.join(__dirname, '../../uploads/current-affairs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup for PDF uploads
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage, fileFilter: (_req, file, cb) => {
  if (file.mimetype !== 'application/pdf') {
    return cb(new Error('Only PDF files are allowed'));
  }
  cb(null, true);
}});

// GET all current affairs
router.get('/', async (_req, res) => {
  try {
    const affairs = await prisma.currentAffair.findMany({ orderBy: { date: 'desc' } });
    res.json(affairs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current affairs' });
  }
});

// POST upload a new current affair PDF (admin only)
router.post('/upload', authenticate, upload.single('pdf') as any, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const file = req.file;
    const { title, date } = req.body;
    if (!file || !title || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const pdfUrl = `/uploads/current-affairs/${file.filename}`;
    const affair = await prisma.currentAffair.create({
      data: {
        title,
        date: new Date(date),
        pdfUrl,
      }
    });
    return res.status(201).json(affair);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to upload current affair PDF' });
  }
});

// DELETE a current affair PDF (admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    const affair = await prisma.currentAffair.findUnique({ where: { id } });
    if (!affair) {
      return res.status(404).json({ error: 'Current affair not found' });
    }
    // Remove the file from disk
    const filePath = path.join(__dirname, '../../', affair.pdfUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await prisma.currentAffair.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete current affair PDF' });
  }
});

export default router; 