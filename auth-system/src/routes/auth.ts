import { Router } from 'express';
import { register, login, verifyOTP, resendOTP, getProfile, updateProfile, sendProfileUpdateOTP, verifyProfileUpdateOTP } from '../controllers/auth';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/profile/send-otp', authenticate, sendProfileUpdateOTP);
router.post('/profile/verify-otp', authenticate, verifyProfileUpdateOTP);

export default router; 