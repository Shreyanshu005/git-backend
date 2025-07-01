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
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
            userId: string;
            mobileNumber: string;
        };

        // Fetch user from DB to get isAdmin
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, mobileNumber: true, isAdmin: true }
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = {
            userId: user.id,
            mobileNumber: user.mobileNumber,
            isAdmin: user.isAdmin,
        };
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}; 