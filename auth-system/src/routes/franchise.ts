import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Submit franchise application (public endpoint)
router.post('/application', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      city,
      state,
      experience,
      investmentAmount,
      message
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !city || !state || !experience || !investmentAmount) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Check if application with same email already exists
    const existingApplication = await prisma.franchiseApplication.findFirst({
      where: { email }
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'An application with this email already exists'
      });
    }

    // Create new franchise application
    const application = await prisma.franchiseApplication.create({
      data: {
        name,
        email,
        phone,
        city,
        state,
        experience,
        investmentAmount,
        message,
        status: 'pending'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Franchise application submitted successfully',
      data: {
        id: application.id,
        name: application.name,
        email: application.email,
        status: application.status
      }
    });

  } catch (error) {
    console.error('Error creating franchise application:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all franchise applications (admin only)
router.get('/applications', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const applications = await prisma.franchiseApplication.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      data: applications
    });

  } catch (error) {
    console.error('Error fetching franchise applications:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get single franchise application (admin only)
router.get('/applications/:id', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const application = await prisma.franchiseApplication.findUnique({
      where: { id: req.params.id }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Franchise application not found'
      });
    }

    return res.json({
      success: true,
      data: application
    });

  } catch (error) {
    console.error('Error fetching franchise application:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update franchise application status (admin only)
router.patch('/applications/:id', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { status, notes } = req.body;

    const application = await prisma.franchiseApplication.update({
      where: { id: req.params.id },
      data: {
        status: status || undefined,
        notes: notes || undefined
      }
    });

    return res.json({
      success: true,
      message: 'Franchise application updated successfully',
      data: application
    });

  } catch (error) {
    console.error('Error updating franchise application:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete franchise application (admin only)
router.delete('/applications/:id', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    await prisma.franchiseApplication.delete({
      where: { id: req.params.id }
    });

    return res.json({
      success: true,
      message: 'Franchise application deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting franchise application:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
