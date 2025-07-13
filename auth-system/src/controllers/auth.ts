import { Request, Response } from 'express';
import { prisma } from '../config/database';
import jwt from 'jsonwebtoken';
import { generateOTP, sendOTP, verifyOTP as verifyOTPUtil } from '../utils/otp';

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map<string, { otp: string; expires: number }>();

// Utility to remove unverified users older than 10 minutes
async function cleanupUnverifiedUsers() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  await prisma.user.deleteMany({
    where: {
      isVerified: false,
      createdAt: { lt: tenMinutesAgo },
    },
  });
}

export const register = async (req: Request, res: Response) => {
    try {
        await cleanupUnverifiedUsers();
        console.log('Register request body:', req.body);
        const { name, mobileNumber } = req.body;

        // Validate input
        if (!name || !mobileNumber) {
            console.log('Missing required fields:', { name, mobileNumber });
            return res.status(400).json({ error: 'Name and mobile number are required' });
        }

        // Check if user already exists
        console.log('Checking for existing user with mobile:', mobileNumber);
        const existingUser = await prisma.user.findUnique({
            where: { mobileNumber }
        });

        if (existingUser) {
            console.log('User already exists:', existingUser);
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create new user
        console.log('Creating new user:', { name, mobileNumber });
        const user = await prisma.user.create({
            data: {
                name,
                mobileNumber,
                isVerified: false
            }
        });
        console.log('User created successfully:', user);

        // Generate and send OTP
        console.log('Generating OTP for:', mobileNumber);
        const otp = generateOTP();
        console.log('Generated OTP:', otp);

        // Send OTP
        console.log('Sending OTP to:', mobileNumber);
        await sendOTP(mobileNumber, otp);
        console.log('OTP sent successfully');

        return res.status(201).json({
            message: 'User registered successfully. Please verify your mobile number.',
            userId: user.id
        });
    } catch (error: any) {
        console.error('Registration error:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            meta: error.meta
        });
        return res.status(500).json({ 
            error: 'Registration failed',
            details: error.message
        });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { mobileNumber } = req.body;

        if (!mobileNumber) {
            return res.status(400).json({ error: 'Mobile number is required' });
        }

        const user = await prisma.user.findUnique({
            where: { mobileNumber }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate and send OTP
        const otp = generateOTP();
        otpStore.set(mobileNumber, {
            otp,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes
        });

        // In production, implement actual SMS sending
        await sendOTP(mobileNumber, otp);

        return res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Login failed' });
    }
};

export const verifyOTP = async (req: Request, res: Response) => {
    try {
        await cleanupUnverifiedUsers();
        console.log('OTP verification request body:', req.body);
        
        const { mobileNumber, otp } = req.body;
        
        if (!mobileNumber || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number and OTP are required'
            });
        }

        console.log('Verifying OTP for mobile:', mobileNumber);
        const result = await verifyOTPUtil(mobileNumber, otp);
        console.log('OTP verification result:', result);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        const user = await prisma.user.findUnique({
            where: { mobileNumber }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update user verification status
        await prisma.user.update({
            where: { id: user.id },
            data: { isVerified: true }
        });

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                mobileNumber: user.mobileNumber,
                isVerified: true
            }
        });
    } catch (error: any) {
        console.error('OTP verification error:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            meta: error.meta
        });
        
        return res.status(500).json({
            success: false,
            message: 'Failed to verify OTP',
            error: error.message
        });
    }
};

export const resendOTP = async (req: Request, res: Response) => {
    try {
        const { mobileNumber } = req.body;

        if (!mobileNumber) {
            return res.status(400).json({ error: 'Mobile number is required' });
        }

        const user = await prisma.user.findUnique({
            where: { mobileNumber }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate and send new OTP
        const otp = generateOTP();
        otpStore.set(mobileNumber, {
            otp,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes
        });

        // In production, implement actual SMS sending
        await sendOTP(mobileNumber, otp);

        return res.json({ message: 'New OTP sent successfully' });
    } catch (error) {
        console.error('Resend OTP error:', error);
        return res.status(500).json({ error: 'Failed to resend OTP' });
    }
};

export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                coursePurchases: true,
                testSeriesPurchases: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
            message: 'Profile fetched successfully',
            user: {
                id: user.id,
                name: user.name,
                mobileNumber: user.mobileNumber,
                isVerified: user.isVerified,
                isAdmin: user.isAdmin,
                coursePurchases: user.coursePurchases,
                testSeriesPurchases: user.testSeriesPurchases
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ error: 'Failed to get profile' });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { name, mobileNumber } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Only allow name updates through this endpoint
        if (mobileNumber) {
            return res.status(400).json({ error: 'Mobile number updates require OTP verification' });
        }

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Name cannot be empty' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { name: name.trim() }
        });

        return res.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                name: user.name,
                mobileNumber: user.mobileNumber,
                isVerified: user.isVerified,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({ error: 'Failed to update profile' });
    }
};

export const sendProfileUpdateOTP = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { mobileNumber } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!mobileNumber) {
            return res.status(400).json({ error: 'Mobile number is required' });
        }

        // Validate mobile number format
        if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
            return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if new mobile number is different from current
        if (mobileNumber === user.mobileNumber) {
            return res.status(400).json({ error: 'New mobile number must be different from current number' });
        }

        // Check if mobile number is already taken by another user
        const existingUser = await prisma.user.findUnique({
            where: { mobileNumber }
        });

        if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({ error: 'Mobile number is already registered with another account' });
        }

        // Generate and send OTP
        const otp = generateOTP();
        otpStore.set(`profile_${mobileNumber}`, {
            otp,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes
        });

        await sendOTP(mobileNumber, otp);

        return res.json({ message: 'OTP sent successfully for mobile number update' });
    } catch (error) {
        console.error('Send profile update OTP error:', error);
        return res.status(500).json({ error: 'Failed to send OTP' });
    }
};

export const verifyProfileUpdateOTP = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { mobileNumber, otp, newMobileNumber } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!mobileNumber || !otp || !newMobileNumber) {
            return res.status(400).json({ error: 'Mobile number, OTP, and new mobile number are required' });
        }

        // Verify OTP
        const storedOTP = otpStore.get(`profile_${mobileNumber}`);
        if (!storedOTP || storedOTP.otp !== otp || Date.now() > storedOTP.expires) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Validate new mobile number format
        if (!/^[6-9]\d{9}$/.test(newMobileNumber)) {
            return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
        }

        // Check if new mobile number is already taken by another user
        const existingUser = await prisma.user.findUnique({
            where: { mobileNumber: newMobileNumber }
        });

        if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({ error: 'Mobile number is already registered with another account' });
        }

        // Update mobile number
        const user = await prisma.user.update({
            where: { id: userId },
            data: { mobileNumber: newMobileNumber }
        });

        // Clear OTP
        otpStore.delete(`profile_${mobileNumber}`);

        return res.json({
            message: 'Mobile number updated successfully',
            user: {
                id: user.id,
                name: user.name,
                mobileNumber: user.mobileNumber,
                isVerified: user.isVerified,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        console.error('Verify profile update OTP error:', error);
        return res.status(500).json({ error: 'Failed to update mobile number' });
    }
}; 