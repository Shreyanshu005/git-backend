import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';
import { uploadToS3, deleteFromS3 } from '../utils/s3';

const router = Router();
const prisma = new PrismaClient();

// GET all DPQ PDFs
router.get('/', async (_req, res) => {
  try {
    const dpqs = await prisma.dailyPracticeQuestion.findMany({ orderBy: { date: 'desc' } });
    res.json(dpqs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch DPQ PDFs' });
  }
});

// POST upload a new DPQ PDF (admin only)
router.post('/upload', authenticate, uploadToS3('dpq').single('pdf'), async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const file = req.file as any;
    const { title, date } = req.body;
    if (!file || !title || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Store the S3 URL in database
    const dpq = await prisma.dailyPracticeQuestion.create({
      data: {
        title,
        date: new Date(date),
        pdfUrl: file.location, // S3 URL
      }
    });
    return res.status(201).json(dpq);
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload DPQ PDF' });
  }
});

// DELETE a DPQ PDF (admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const dpq = await prisma.dailyPracticeQuestion.findUnique({ where: { id } });
    
    if (!dpq) {
      return res.status(404).json({ error: 'DPQ not found' });
    }
    
    // Delete file from S3
    if (dpq.pdfUrl) {
      try {
        await deleteFromS3(dpq.pdfUrl);
      } catch (s3Error) {
        console.error('S3 delete error:', s3Error);
        // Continue with database deletion even if S3 delete fails
      }
    }
    
    // Delete from database
    await prisma.dailyPracticeQuestion.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: 'Failed to delete DPQ PDF' });
  }
});

export default router; 