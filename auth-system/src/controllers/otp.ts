import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../types';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';

// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP in memory (in production, use Redis or similar)
const otpStore = new Map<string, { otp: string; timestamp: number }>();

// In a real application, you would integrate with an SMS service provider
// This is a mock function to simulate sending SMS
const sendSMS = async (mobileNumber: string, otp: string) => {
    // TODO: Integrate with your SMS service provider
    console.log(`Sending OTP ${otp} to ${mobileNumber}`);
    return true;
};

export const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { mobileNumber } = req.body;
        const otp = generateOTP();
        
        // Store OTP with 10-minute expiration
        otpStore.set(mobileNumber, {
            otp,
            timestamp: Date.now() + 10 * 60 * 1000
        });

        // Send OTP via SMS
        await sendSMS(mobileNumber, otp);
        
        res.status(200).json({
            success: true,
            message: 'OTP sent successfully'
        });
    } catch (error) {
        next(new CustomError('Failed to send OTP', 500, (error as Error).message));
    }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { mobileNumber, otp } = req.body;
        
        const storedData = otpStore.get(mobileNumber);
        if (!storedData) {
            next(new CustomError('OTP expired or not found', 400));
            return;
        }

        if (Date.now() > storedData.timestamp) {
            otpStore.delete(mobileNumber);
            next(new CustomError('OTP expired', 400));
            return;
        }

        if (storedData.otp !== otp) {
            next(new CustomError('Invalid OTP', 400));
            return;
        }

        // Update user verification status
        const user = await User.findOneAndUpdate(
            { mobileNumber },
            { isVerified: true },
            { new: true }
        );

        if (!user) {
            next(new CustomError('User not found', 404));
            return;
        }

        // Generate JWT token
        const token = jwt.sign(
            { _id: user._id, version: user.version },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

        const refreshToken = jwt.sign(
            { _id: user._id, version: user.version },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' }
        );

        // Clear OTP after successful verification
        otpStore.delete(mobileNumber);

        res.status(200).json({
            success: true,
            message: 'Mobile number verified successfully',
            token,
            refreshToken
        });
    } catch (error) {
        next(new CustomError('Failed to verify OTP', 500, (error as Error).message));
    }
};

export const resendOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { mobileNumber } = req.body;
        
        // Check if user exists
        const user = await User.findOne({ mobileNumber });
        if (!user) {
            next(new CustomError('User not found', 404));
            return;
        }

        // Send new OTP
        await sendOtp(req, res, next);
    } catch (error) {
        next(new CustomError('Failed to resend OTP', 500, (error as Error).message));
    }
}; 