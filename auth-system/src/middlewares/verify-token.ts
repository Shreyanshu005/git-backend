import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CustomRequest, CustomError } from '../types';
import { User } from '../models/User';

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
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

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { _id: string; version: number };
        
        const user = await User.findById(decoded._id);
        if (!user) {
            next(new CustomError('User not found', 404));
            return;
        }

        if (user.version !== decoded.version) {
            next(new CustomError('Session expired. Please login again.', 401));
            return;
        }

        (req as CustomRequest).user = { _id: user._id };
        next();
    } catch (error) {
        next(new CustomError('Invalid token', 401));
    }
}; 