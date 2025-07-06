import { Router } from 'express';
import { register, login, verifyOTP, resendOTP, getProfile, updateProfile, sendProfileUpdateOTP, verifyProfileUpdateOTP } from '../controllers/auth';
import { authenticate } from '../middlewares/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

// Public routes
router.post('/register', register );
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/profile/send-otp', authenticate, sendProfileUpdateOTP);
router.post('/profile/verify-otp', authenticate, verifyProfileUpdateOTP);

// Make user admin (development only)
router.post('/make-admin/:mobileNumber', async (req, res) => {
  try {
    const { mobileNumber } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { mobileNumber }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const updatedUser = await prisma.user.update({
      where: { mobileNumber },
      data: { isAdmin: true }
    });
    
    return res.json({
      message: 'User made admin successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        mobileNumber: updatedUser.mobileNumber,
        isAdmin: updatedUser.isAdmin
      }
    });
  } catch (error) {
    console.error('Make admin error:', error);
    return res.status(500).json({ error: 'Failed to make user admin' });
  }
});

// Debug endpoint to check admin status
router.get('/debug-admin', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      select: { id: true, name: true, mobileNumber: true, isAdmin: true, isVerified: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json({
      message: 'Admin status debug info',
      user: {
        id: user.id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified
      },
      tokenUser: req.user
    });
  } catch (error) {
    console.error('Debug admin error:', error);
    return res.status(500).json({ error: 'Failed to get debug info' });
  }
});

export default router; 