import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

jest.mock('ioredis', () => {
  const RedisMock = require('ioredis-mock');
  return RedisMock;
});

jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  return {
    ...actual,
    PrismaClient: jest.fn(),
  };
});

jest.mock('../src/core/logger/index', () => ({
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

jest.mock('../src/core/queue/index', () => {
  const mockQueue = {
    add: jest.fn(),
    getJob: jest.fn(),
    getWaitingCount: jest.fn(),
    getActiveCount: jest.fn(),
    getCompletedCount: jest.fn(),
    getFailedCount: jest.fn(),
    getDelayedCount: jest.fn(),
    isPaused: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    close: jest.fn(),
  };

  const mockWorker = {
    on: jest.fn(),
    close: jest.fn(),
  };

  return {
    QueueName: {
      VIDEO_GENERATION: 'video-generation-queue',
      PROMPT_ENHANCEMENT: 'prompt-enhancement-queue',
      THUMBNAIL_GENERATION: 'thumbnail-generation-queue',
    },
    JobType: {
      VIDEO_GENERATION: 'video-generation',
      PROMPT_ENHANCEMENT: 'prompt-enhancement',
      THUMBNAIL_GENERATION: 'thumbnail-generation',
    },
    QueueService: jest.fn().mockImplementation(() => ({
      queues: new Map(),
      addJob: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
      getJobStatus: jest.fn(),
      getQueueStats: jest.fn(),
      pauseQueue: jest.fn(),
      resumeQueue: jest.fn(),
      getQueue: jest.fn().mockResolvedValue(mockQueue),
      createWorker: jest.fn().mockReturnValue(mockWorker),
      close: jest.fn(),
    })),
    queueService: {
      queues: new Map(),
      addJob: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
      getJobStatus: jest.fn(),
      getQueueStats: jest.fn(),
      pauseQueue: jest.fn(),
      resumeQueue: jest.fn(),
      getQueue: jest.fn().mockResolvedValue(mockQueue),
      createWorker: jest.fn().mockReturnValue(mockWorker),
      close: jest.fn(),
    },
  };
});

jest.mock('../src/websocket/index', () => ({
  initSocketIO: jest.fn().mockReturnValue({
    on: jest.fn(),
    use: jest.fn(),
  }),
  getIO: jest.fn().mockReturnValue({
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    on: jest.fn(),
  }),
}));

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

export const JWT_TEST_SECRET = 'test-jwt-secret-key-for-testing';

export function createTestToken(overrides: Partial<{ userId: string; email: string; role: 'USER' | 'ADMIN' }> = {}): string {
  const payload = {
    userId: overrides.userId ?? 'test-user-id-12345',
    email: overrides.email ?? 'test@example.com',
    role: overrides.role ?? 'USER',
  };

  return jwt.sign(payload, JWT_TEST_SECRET, {
    expiresIn: '1h',
    algorithm: 'HS256',
  });
}

export function createExpiredToken(overrides: Partial<{ userId: string; email: string; role: 'USER' | 'ADMIN' }> = {}): string {
  const payload = {
    userId: overrides.userId ?? 'test-user-id-12345',
    email: overrides.email ?? 'test@example.com',
    role: overrides.role ?? 'USER',
  };

  return jwt.sign(payload, JWT_TEST_SECRET, {
    expiresIn: '0s',
    algorithm: 'HS256',
  });
}

export function createAdminToken(overrides: Partial<{ userId: string; email: string }> = {}): string {
  return createTestToken({
    userId: overrides.userId ?? 'admin-user-id-67890',
    email: overrides.email ?? 'admin@example.com',
    role: 'ADMIN',
  });
}

export async function createTestUser(overrides: Partial<{
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'USER' | 'ADMIN';
  plan: string;
  credits: number;
}> = {}): Promise<{
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  plan: string;
  credits: number;
}> {
  const hashedPassword = await bcrypt.hash(overrides.password ?? 'password123', 4);
  return {
    id: overrides.id ?? 'test-user-id-12345',
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? 'test@example.com',
    password: hashedPassword,
    role: overrides.role ?? 'USER',
    plan: overrides.plan ?? 'FREE',
    credits: overrides.credits ?? 100,
  };
}

export function mockPrismaFindUnique(model: string, result: unknown) {
  return jest.fn().mockResolvedValue(result);
}

beforeAll(async () => {
  jest.setTimeout(30000);
});

afterAll(async () => {
  jest.clearAllMocks();
  jest.resetModules();
});

beforeEach(async () => {
  jest.clearAllMocks();
});
