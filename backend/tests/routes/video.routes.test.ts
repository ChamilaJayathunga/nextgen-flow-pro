import express, { Express, NextFunction, Request, Response } from 'express';
import supertest from 'supertest';
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
    jwt: { secret: 'test-jwt-secret-key-for-testing', expiresIn: '1h' },
    uploadDir: './uploads',
  },
}));

jest.mock('../../src/middleware/upload', () => ({
  upload: {
    single: jest.fn(() => (req: any, _res: Response, next: NextFunction) => next()),
  },
}));

jest.mock('../../src/middleware/validate', () => ({
  validate: jest.fn((schema: any) => (req: Request, _res: Response, next: NextFunction) => {
    const { ValidationError } = require('../../src/core/error-handler/index');
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      const details: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const path = issue.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(issue.message);
      }
      return next(new ValidationError('Validation failed', details));
    }
  }),
  validateQuery: jest.fn((schema: any) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error: any) {
      next(new (require('../../src/core/error-handler/index').ValidationError)('Query validation failed'));
    }
  }),
}));

jest.mock('../../src/core/auth/index', () => {
  const jwt = require('jsonwebtoken');
  const secret = 'test-jwt-secret-key-for-testing';
  return {
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
    optionalAuth: jest.fn((_req: any, _res: Response, next: NextFunction) => next()),
    AuthRequest: {} as any,
  };
});

jest.mock('../../src/core/error-handler/index', () => {
  class AppError extends Error {
    statusCode: number; code: string;
    constructor(m: string, s: number, c: string) { super(m); this.statusCode = s; this.code = c; }
  }
  return {
    AppError,
    NotFoundError: class extends AppError { constructor(m = 'Not found') { super(m, 404, 'NOT_FOUND'); } },
    ValidationError: class extends AppError { constructor(m = 'Validation failed', public details?: any) { super(m, 400, 'VALIDATION_ERROR'); } },
    AuthenticationError: class extends AppError { constructor(m = 'Auth failed') { super(m, 401, 'AUTHENTICATION_ERROR'); } },
    errorHandler: (err: any, _req: Request, res: Response, _next: NextFunction) => {
      const sc = err.statusCode || 500;
      res.status(sc).json({ status: 'error', message: err.message, code: err.code || 'INTERNAL_ERROR' });
    },
  };
});

const mockJobService = {
  createJob: jest.fn(),
  getJob: jest.fn(),
  getUserJobs: jest.fn(),
  deleteJob: jest.fn(),
  updateJobStatus: jest.fn(),
  getJobStats: jest.fn(),
};

const mockProviderService = {
  getBestProvider: jest.fn(),
  generateVideo: jest.fn(),
  cancelJob: jest.fn(),
};

const mockPromptService = {
  enhancePrompt: jest.fn(),
};

const mockBillingService = {
  canGenerate: jest.fn(),
  deductCredits: jest.fn(),
};

jest.mock('../../src/services/job.service', () => ({
  jobService: mockJobService,
  JobService: jest.fn(),
}));

jest.mock('../../src/services/provider.service', () => ({
  providerService: mockProviderService,
  ProviderService: jest.fn(),
}));

jest.mock('../../src/services/prompt.service', () => ({
  promptService: mockPromptService,
  PromptService: jest.fn(),
}));

jest.mock('../../src/services/billing.service', () => ({
  billingService: mockBillingService,
  BillingService: jest.fn(),
}));

jest.mock('../../src/core/queue/index', () => ({
  QueueName: { VIDEO_GENERATION: 'video-generation-queue' },
  JobType: { VIDEO_GENERATION: 'video-generation' },
  queueService: {
    addJob: jest.fn().mockResolvedValue({ id: 'queue-job-id' }),
  },
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({})),
  VideoStatus: { PENDING: 'PENDING', PROCESSING: 'PROCESSING', COMPLETED: 'COMPLETED', FAILED: 'FAILED', CANCELLED: 'CANCELLED' },
}));

import videoRoutes from '../../src/routes/video.routes';

describe('Video Routes (Integration)', () => {
  let app: Express;
  const validToken = jwt.sign(
    { userId: 'test-user-id', email: 'test@example.com', role: 'USER' },
    'test-jwt-secret-key-for-testing',
    { expiresIn: '1h', algorithm: 'HS256' },
  );

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/video', videoRoutes);
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const { errorHandler } = require('../../src/core/error-handler/index');
      errorHandler(err, _req, res, _next);
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockBillingService.canGenerate.mockResolvedValue({ allowed: true, requiredCredits: 5 });
    mockBillingService.deductCredits.mockResolvedValue({ success: true, remainingCredits: 95 });
    mockProviderService.getBestProvider.mockReturnValue({ name: 'bestProvider' });
  });

  describe('POST /api/video/generate', () => {
    it('should generate a video successfully', async () => {
      mockJobService.createJob.mockResolvedValue({
        id: 'new-job-id',
        userId: 'test-user-id',
        prompt: 'Test prompt',
        provider: 'bestProvider',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      const response = await supertest(app)
        .post('/api/video/generate')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ prompt: 'Test prompt' })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.job).toBeDefined();
      expect(response.body.data.job.prompt).toBe('Test prompt');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await supertest(app)
        .post('/api/video/generate')
        .send({ prompt: 'Test prompt' })
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should return 400 when prompt is missing', async () => {
      const response = await supertest(app)
        .post('/api/video/generate')
        .set('Authorization', `Bearer ${validToken}`)
        .send({})
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should return 400 when prompt is empty', async () => {
      const response = await supertest(app)
        .post('/api/video/generate')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ prompt: '' })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should enhance prompt when enhancePrompt is true', async () => {
      mockPromptService.enhancePrompt.mockResolvedValue({
        original: 'Test prompt',
        enhanced: 'An enhanced version of Test prompt with cinematic details',
        keywords: ['test'],
        style: 'cinematic',
        mood: 'dramatic',
      });

      mockJobService.createJob.mockResolvedValue({
        id: 'new-job-id',
        userId: 'test-user-id',
        prompt: 'Test prompt',
        provider: 'bestProvider',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      const response = await supertest(app)
        .post('/api/video/generate')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ prompt: 'Test prompt', enhancePrompt: true })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(mockPromptService.enhancePrompt).toHaveBeenCalledWith('Test prompt');
    });

    it('should reject when user has insufficient credits', async () => {
      mockBillingService.canGenerate.mockResolvedValue({
        allowed: false,
        reason: 'Insufficient credits. Need 5, have 0',
        requiredCredits: 5,
      });

      const response = await supertest(app)
        .post('/api/video/generate')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ prompt: 'Test prompt' })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should use specified provider when provided', async () => {
      mockJobService.createJob.mockResolvedValue({
        id: 'new-job-id',
        userId: 'test-user-id',
        prompt: 'Test prompt',
        provider: 'runway',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      const response = await supertest(app)
        .post('/api/video/generate')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ prompt: 'Test prompt', provider: 'runway' })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(mockJobService.createJob).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'runway' }),
      );
    });
  });

  describe('GET /api/video/jobs', () => {
    it('should return paginated jobs for authenticated user', async () => {
      mockJobService.getUserJobs.mockResolvedValue({
        data: [
          { id: 'job-1', prompt: 'Test 1', provider: 'p1', status: 'COMPLETED', resultUrl: null, thumbnailUrl: null, progress: 100, duration: 10, cost: 1, createdAt: new Date(), updatedAt: new Date() },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const response = await supertest(app)
        .get('/api/video/jobs')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
    });

    it('should return empty list when no jobs exist', async () => {
      mockJobService.getUserJobs.mockResolvedValue({
        data: [], total: 0, page: 1, limit: 20, totalPages: 0,
      });

      const response = await supertest(app)
        .get('/api/video/jobs')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.data.data).toHaveLength(0);
      expect(response.body.data.total).toBe(0);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await supertest(app)
        .get('/api/video/jobs')
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should support pagination parameters', async () => {
      mockJobService.getUserJobs.mockResolvedValue({
        data: [], total: 0, page: 2, limit: 10, totalPages: 0,
      });

      const response = await supertest(app)
        .get('/api/video/jobs?page=2&limit=10')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(mockJobService.getUserJobs).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ page: 2, limit: 10 }),
      );
    });
  });

  describe('GET /api/video/jobs/:id', () => {
    it('should return a specific job', async () => {
      mockJobService.getJob.mockResolvedValue({
        id: 'job-123',
        prompt: 'Test job',
        enhancedPrompt: null,
        provider: 'testProvider',
        status: 'COMPLETED',
        resultUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        imageUrl: null,
        videoRefUrl: null,
        parameters: {},
        errorMessage: null,
        progress: 100,
        duration: 10,
        cost: 0.5,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'test-user-id', name: 'Test', email: 'test@example.com' },
      });

      const response = await supertest(app)
        .get('/api/video/jobs/job-123')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.job.id).toBe('job-123');
    });

    it('should return 404 for nonexistent job', async () => {
      mockJobService.getJob.mockRejectedValue(
        new (require('../../src/core/error-handler/index').NotFoundError)('Video job nonexistent not found'),
      );

      const response = await supertest(app)
        .get('/api/video/jobs/nonexistent')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await supertest(app)
        .get('/api/video/jobs/job-123')
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });
});
