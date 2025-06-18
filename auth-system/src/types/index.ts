import { Request } from 'express';
import { Socket } from 'socket.io';

export interface CustomRequest extends Request {
    user?: {
        _id: string;
    };
}

export interface CustomSocket extends Socket {
    user?: {
        _id: string;
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