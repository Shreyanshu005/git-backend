import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../types';
import { User } from '../models/User';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Store reset tokens in memory (in production, use Redis or similar)
const resetTokenStore = new Map<string, { token: string; timestamp: number }>();

export const requestPasswordReset = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        
        // Check if user exists
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            next(new CustomError('User not found', 404));
            return;
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Store token with 1-hour expiration
        resetTokenStore.set(email, {
            token: resetToken,
            timestamp: Date.now() + 60 * 60 * 1000
        });

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h1>Password Reset Request</h1>
                <p>Click the link below to reset your password:</p>
                <a href="${resetLink}">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        
        res.status(200).json({
            success: true,
            message: 'Password reset link sent to your email'
        });
    } catch (error) {
        next(new CustomError('Failed to send reset link', 500, (error as Error).message));
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, token, newPassword } = req.body;
        
        const storedData = resetTokenStore.get(email);
        if (!storedData) {
            next(new CustomError('Reset token expired or not found', 400));
            return;
        }

        if (Date.now() > storedData.timestamp) {
            resetTokenStore.delete(email);
            next(new CustomError('Reset token expired', 400));
            return;
        }

        if (storedData.token !== token) {
            next(new CustomError('Invalid reset token', 400));
            return;
        }

        // Update password and increment version to invalidate old sessions
        await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            { 
                password: newPassword,
                $inc: { version: 1 }
            }
        );

        // Clear reset token
        resetTokenStore.delete(email);

        res.status(200).json({
            success: true,
            message: 'Password reset successful'
        });
    } catch (error) {
        next(new CustomError('Failed to reset password', 500, (error as Error).message));
    }
}; 