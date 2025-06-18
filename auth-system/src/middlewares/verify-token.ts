import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CustomRequest, CustomError } from '../types';
import { prisma } from '../config/database';

export const verifyToken = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader) {
            next(new CustomError('Access denied. No token provided.', 401));
            return;
        }

        const token = authHeader.replace('Bearer ', '');
        
        if (!token) {
            next(new CustomError('Access denied. No token provided.', 401));
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string; mobileNumber: string };
        
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });
        
        if (!user) {
            next(new CustomError('User not found', 404));
            return;
        }

        (req as CustomRequest).user = { 
            userId: user.id,
            mobileNumber: user.mobileNumber 
        };
        next();
    } catch (error) {
        next(new CustomError('Invalid token', 401));
    }
}; 