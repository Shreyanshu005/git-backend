import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                mobileNumber: string;
                isAdmin: boolean;
            };
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            console.log('❌ No token provided');
            return res.status(401).json({ error: 'Authentication required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
            userId: string;
            mobileNumber: string;
        };
            console.log('🔑 Decoded JWT:', decoded);
        } catch (err) {
            console.log('❌ Invalid token:', err.message);
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Fetch user from DB to get isAdmin
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, mobileNumber: true, isAdmin: true }
        });
        if (!user) {
            console.log('❌ User not found for userId:', decoded.userId);
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = {
            userId: user.id,
            mobileNumber: user.mobileNumber,
            isAdmin: user.isAdmin,
        };
        console.log('✅ Authenticated user:', req.user);
        return next();
    } catch (error) {
        console.log('❌ Auth middleware error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
}; 