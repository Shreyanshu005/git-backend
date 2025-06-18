import { Router } from 'express';
import { register, login, verifyOTP, resendOTP, getProfile } from '../controllers/auth';

const router = Router();

// Public routes
router.post('/register', register );
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Protected routes
router.get('/profile', getProfile);

export default router; 