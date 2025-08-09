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
                isAdmin?: boolean;
            };
        }
    }
}

interface JwtPayload {
    userId: string;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            console.log('❌ No token provided');
            return res.status(401).json({ error: 'Authentication required' });
        }

        let decoded: JwtPayload;
        try {
            if (!process.env.JWT_SECRET) {
                console.error('❌ JWT_SECRET is not configured');
                return res.status(500).json({ error: 'Server configuration error' });
            }
            
            decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
            console.log('🔑 Decoded JWT:', decoded);
            
            if (!decoded.userId) {
                console.error('❌ Token missing userId');
                return res.status(401).json({ 
                    error: 'Invalid token format',
                    details: 'Token is missing required user information'
                });
            }
        } catch (err) {
            console.error('❌ Token verification failed:', {
                error: err.message,
                name: err.name,
                token: token ? `${token.substring(0, 10)}...` : 'undefined'
            });
            
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    error: 'Token expired',
                    details: 'Your session has expired. Please log in again.'
                });
            }
            
            return res.status(401).json({ 
                error: 'Invalid token',
                details: err.message,
                code: err.name
            });
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