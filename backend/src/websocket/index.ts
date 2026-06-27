import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken, TokenPayload } from '../core/auth/index.js';
import { config } from '../core/config/index.js';
import { logger } from '../core/logger/index.js';

let io: Server | null = null;

export function initSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyToken(token as string);
      (socket as any).user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as TokenPayload;
    const room = `user:${user.userId}`;

    socket.join(room);

    logger.info(`WebSocket client connected`, {
      userId: user.userId,
      socketId: socket.id,
    });

    socket.emit('connected', {
      userId: user.userId,
      message: 'Connected to NextGen Flow Pro WebSocket',
    });

    socket.on('subscribe:job', (jobId: string) => {
      const jobRoom = `job:${jobId}`;
      socket.join(jobRoom);
      logger.debug(`Socket ${socket.id} subscribed to job ${jobId}`);
    });

    socket.on('unsubscribe:job', (jobId: string) => {
      const jobRoom = `job:${jobId}`;
      socket.leave(jobRoom);
      logger.debug(`Socket ${socket.id} unsubscribed from job ${jobId}`);
    });

    socket.on('disconnect', (reason: string) => {
      logger.info(`WebSocket client disconnected`, {
        userId: user.userId,
        socketId: socket.id,
        reason,
      });
    });
  });

  logger.info('Socket.io initialized', {
    corsOrigin: config.corsOrigin,
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}
