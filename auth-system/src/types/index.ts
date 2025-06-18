import { Request } from 'express';
import { Socket } from 'socket.io';

export interface CustomRequest extends Request {
    user?: {
        userId: string;
        mobileNumber: string;
    };
}

export interface CustomSocket extends Socket {
    user?: {
        userId: string;
        name: string;
    };
}

export class CustomError extends Error {
    statusCode: number;
    details?: string;

    constructor(message: string, statusCode: number, details?: string) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
    }
} 