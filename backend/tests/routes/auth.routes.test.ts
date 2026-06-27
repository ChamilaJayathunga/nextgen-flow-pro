import express, { Express, NextFunction, Request, Response } from 'express';
import supertest from 'supertest';
import authRoutes from '../../src/routes/auth.routes';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('../../src/core/logger/index', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  LoggerStream: jest.fn().mockImplementation(() => ({
    write: jest.fn(),
  })),
}));

jest.mock('../../src/core/config/index', () => ({
  config: {
    jwt: {
      secret: 'test-jwt-secret-key-for-testing',
      expiresIn: '1h',
    },
  },
}));

jest.mock('../../src/middleware/validate', () => ({
  validate: jest.fn((schema: any) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const { ValidationError } = require('../../src/core/error-handler/index');
      const details: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(issue.message);
      }
      return next(new ValidationError('Validation failed', details));
    }
    req.body = result.data;
    next();
  }),
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../../src/core/auth/index', () => {
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const secret = 'test-jwt-secret-key-for-testing';
  return {
    generateToken: jest.fn((payload: any) => {
      return jwt.sign(payload, secret, { expiresIn: '1h', algorithm: 'HS256' });
    }),
    hashPassword: jest.fn((password: string) => bcrypt.hash(password, 4)),
    comparePassword: jest.fn((password: string, hash: string) => bcrypt.compare(password, hash)),
    authenticate: jest.fn((req: any, _res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        const { AuthenticationError } = require('../../src/core/error-handler/index');
        return next(new AuthenticationError('No authorization header provided'));
      }
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        const { AuthenticationError } = require('../../src/core/error-handler/index');
        return next(new AuthenticationError('Invalid authorization header'));
      }
      try {
        const decoded = jwt.verify(parts[1], secret);
        req.user = decoded;
        next();
      } catch {
        const { AuthenticationError } = require('../../src/core/error-handler/index');
        next(new AuthenticationError('Token expired'));
      }
    }),
    AuthRequest: {} as any,
  };
});

jest.mock('../../src/core/error-handler/index', () => {
  class AppError extends Error {
    statusCode: number;
    code: string;
    details?: Record<string, string[]>;
    constructor(message: string, statusCode: number, code: string, details?: Record<string, string[]>) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      this.details = details;
    }
  }
  return {
    AppError,
    NotFoundError: class extends AppError { constructor(m = 'Resource not found') { super(m, 404, 'NOT_FOUND'); } },
    ValidationError: class extends AppError { constructor(m = 'Validation failed', d?: Record<string, string[]>) { super(m, 400, 'VALIDATION_ERROR'); this.details = d; } },
    AuthenticationError: class extends AppError { constructor(m = 'Authentication failed') { super(m, 401, 'AUTHENTICATION_ERROR'); } },
    errorHandler: (err: any, _req: Request, res: Response, _next: NextFunction) => {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Internal server error',
        code: err.code || 'INTERNAL_ERROR',
        ...(err.details && { details: err.details }),
      });
    },
  };
});

describe('Auth Routes (Integration)', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const { errorHandler } = require('../../src/core/error-handler/index');
      errorHandler(err, _req, res, _next);
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        name: 'New User',
        email: 'newuser@example.com',
        role: 'USER',
        plan: 'FREE',
        createdAt: new Date(),
      });

      const response = await supertest(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.name).toBe('New User');
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.token).toBeDefined();
    });

    it('should return 400 for duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: 'existing@example.com',
      });

      const response = await supertest(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate',
          email: 'existing@example.com',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing fields', async () => {
      const response = await supertest(app)
        .post('/api/auth/register')
        .send({
          name: 'No Email',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await supertest(app)
        .post('/api/auth/register')
        .send({
          name: 'Bad Email',
          email: 'not-an-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should return 400 for short password', async () => {
      const response = await supertest(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Password',
          email: 'short@example.com',
          password: 'short',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 4);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'USER',
        plan: 'FREE',
        credits: 100,
        image: null,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBeDefined();
    });

    it('should return 401 for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 4);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'USER',
      });

      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return 401 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return 400 for missing email', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          password: 'password123',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should return 400 for missing password', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/auth/me', () => {
    const validToken = jwt.sign(
      { userId: 'user-id', email: 'test@example.com', role: 'USER' },
      'test-jwt-secret-key-for-testing',
      { expiresIn: '1h', algorithm: 'HS256' },
    );

    it('should return authenticated user profile', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'USER',
        plan: 'FREE',
        credits: 100,
        image: null,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await supertest(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await supertest(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should return 401 with invalid token', async () => {
      const response = await supertest(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should return 404 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await supertest(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await supertest(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Logged out successfully');
    });
  });
});
