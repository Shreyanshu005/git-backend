import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import { authenticate } from './middlewares/auth';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://ias-frontend-snowy.vercel.app',
    'https://www.maheshanias.com',
    'https://maheshanias.com'

  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/auth', authRoutes);

// Protected route example
app.get('/api/protected', authenticate, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    name: err.name
  });
  
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message,
    type: err.name
  });
});

const PORT = process.env.PORT || 3000;

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 