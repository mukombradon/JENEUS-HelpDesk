import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import Redis from 'ioredis';

import config from './config';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';
import { setupSocket } from './socket';
import './workers/slaCheck';

// ---------------------------------------------------------------------------
// Production safety checks
// ---------------------------------------------------------------------------
if (config.nodeEnv === 'production') {
  const missing: string[] = [];
  if (!process.env.JWT_ACCESS_SECRET) missing.push('JWT_ACCESS_SECRET');
  if (!process.env.JWT_REFRESH_SECRET) missing.push('JWT_REFRESH_SECRET');
  if (missing.length > 0) {
    console.error(`[FATAL] ${missing.join(' and ')} must be set in production`);
    process.exit(1);
  }
}

const app = express();
const httpServer = createServer(app);

// ---------------------------------------------------------------------------
// Socket.io
// ---------------------------------------------------------------------------
const io = new SocketServer(httpServer, {
  cors: {
    origin: config.frontendUrl,
    credentials: true,
  },
});

app.set('io', io);
setupSocket(io);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(helmet());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/v1', routes);

// ---------------------------------------------------------------------------
// Error handler (must be registered after routes)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Redis
// ---------------------------------------------------------------------------
const redis = new Redis(config.redis.url);

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

redis.on('error', (err) => {
  console.error('[Redis] Error:', err.message);
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
httpServer.listen(config.port, () => {
  console.log(`[Server] Listening on port ${config.port} (${config.nodeEnv})`);
});

export { app, httpServer, io, redis };
