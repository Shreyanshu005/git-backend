import { Socket } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { prisma } from '../config/database';
import { CustomSocket } from '../types';

interface User {
    userId: string;
    mobileNumber: string;
}

interface AuthError {
    type: 'AUTH_ERROR' | 'USER_NOT_FOUND' | 'TOKEN_EXPIRED' | 'TOKEN_MISSING';
    message: string;
}

const authenticateSocket = async (socket: Socket, next: Function) => {
    const token = socket.handshake.query.token;
    
    if (!token) {
        const error: AuthError = {
            type: 'TOKEN_MISSING',
            message: 'No authentication token provided'
        };
        socket.emit('auth_error', error);
        return next(new Error(error.message));
    }

    try {
        const decoded = jwt.verify(token as string, process.env.JWT_SECRET as string) as unknown as JwtPayload & User;
        const userId = decoded.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        
        if (!user) {
            const error: AuthError = {
                type: 'USER_NOT_FOUND',
                message: 'User not found in database'
            };
            socket.emit('auth_error', error);
            return next(new Error(error.message));
        }

        const customSocket = socket as CustomSocket;
        customSocket.user = {
            userId: user.id,
            name: user.name,
        };
        next();

    } catch (err) {
        const error: AuthError = {
            type: 'AUTH_ERROR',
            message: 'Invalid authentication token'
        };
        socket.emit('auth_error', error);
        return next(new Error(error.message));
    }
};

export default authenticateSocket; 