import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';
import { uploadToS3, deleteFromS3 } from '../utils/s3';

const router = Router();
const prisma = new PrismaClient();

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
router.post('/upload', authenticate, uploadToS3('current-affairs').single('pdf'), async (req, res) => {
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
    const affair = await prisma.currentAffair.create({
      data: {
        title,
        date: new Date(date),
        pdfUrl: file.location, // S3 URL
      }
    });
    
    return res.status(201).json(affair);
  } catch (error) {
    console.error('Upload error:', error);
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
    
    // Delete file from S3
    if (affair.pdfUrl) {
      try {
        await deleteFromS3(affair.pdfUrl);
      } catch (s3Error) {
        console.error('S3 delete error:', s3Error);
        // Continue with database deletion even if S3 delete fails
      }
    }
    
    // Delete from database
    await prisma.currentAffair.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: 'Failed to delete current affair PDF' });
  }
});

export default router; 