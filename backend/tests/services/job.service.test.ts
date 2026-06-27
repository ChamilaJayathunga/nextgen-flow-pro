import { JobService } from '../../src/services/job.service';
import { VideoStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../src/core/error-handler/index';

const mockPrisma = {
  videoJob: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
  },
  providerUsage: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
  VideoStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
  },
  Prisma: {
    JsonNull: 'JsonNull',
    InputJsonValue: {},
    VideoJobWhereUniqueInput: {},
    VideoJobWhereInput: {},
    VideoJobOrderByWithRelationInput: {},
    VideoJobUpdateInput: {},
  },
}));

jest.mock('../../src/core/logger/index', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'fixed-uuid-12345'),
}));

describe('JobService', () => {
  let jobService: JobService;
  const userId = 'test-user-id';
  const otherUserId = 'other-user-id';
  const mockJob = {
    id: 'job-123',
    userId: userId,
    prompt: 'Test prompt',
    enhancedPrompt: null,
    provider: 'testProvider',
    status: VideoStatus.PENDING,
    resultUrl: null,
    thumbnailUrl: null,
    imageUrl: null,
    videoRefUrl: null,
    parameters: {},
    errorMessage: null,
    progress: 0,
    duration: null,
    cost: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    user: { id: userId, name: 'Test User', email: 'test@example.com' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jobService = new JobService();
  });

  describe('createJob', () => {
    it('should create a new video job', async () => {
      const input = {
        userId,
        prompt: 'Test prompt',
        provider: 'testProvider',
        enhancedPrompt: 'Enhanced test prompt',
        parameters: { duration: 10, resolution: '1080p' },
      };

      mockPrisma.videoJob.create.mockResolvedValue({
        id: 'fixed-uuid-12345',
        userId: input.userId,
        prompt: input.prompt,
        provider: input.provider,
        status: VideoStatus.PENDING,
        createdAt: new Date(),
      });

      const result = await jobService.createJob(input);

      expect(result.id).toBe('fixed-uuid-12345');
      expect(result.userId).toBe(userId);
      expect(result.prompt).toBe('Test prompt');
      expect(result.provider).toBe('testProvider');
      expect(result.status).toBe(VideoStatus.PENDING);
      expect(mockPrisma.videoJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            prompt: 'Test prompt',
            provider: 'testProvider',
            status: VideoStatus.PENDING,
          }),
        }),
      );
    });

    it('should create job without optional fields', async () => {
      const input = {
        userId,
        prompt: 'Minimal prompt',
        provider: 'testProvider',
      };

      mockPrisma.videoJob.create.mockResolvedValue({
        id: 'fixed-uuid-12345',
        userId: input.userId,
        prompt: input.prompt,
        provider: input.provider,
        status: VideoStatus.PENDING,
        createdAt: new Date(),
      });

      const result = await jobService.createJob(input);

      expect(result.prompt).toBe('Minimal prompt');
      expect(mockPrisma.videoJob.create).toHaveBeenCalled();
    });
  });

  describe('getJob', () => {
    it('should return a job by ID', async () => {
      mockPrisma.videoJob.findUnique.mockResolvedValue(mockJob);

      const result = await jobService.getJob('job-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('job-123');
      expect(result.prompt).toBe('Test prompt');
    });

    it('should throw NotFoundError when job does not exist', async () => {
      mockPrisma.videoJob.findUnique.mockResolvedValue(null);

      await expect(jobService.getJob('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when userId does not match', async () => {
      mockPrisma.videoJob.findUnique.mockResolvedValue(mockJob);

      await expect(jobService.getJob('job-123', otherUserId)).rejects.toThrow(NotFoundError);
    });

    it('should return job when userId matches', async () => {
      mockPrisma.videoJob.findUnique.mockResolvedValue(mockJob);

      const result = await jobService.getJob('job-123', userId);

      expect(result).toBeDefined();
      expect(result.id).toBe('job-123');
    });
  });

  describe('getUserJobs', () => {
    const mockJobs = [
      { id: 'job-1', prompt: 'Prompt 1', provider: 'p1', status: 'COMPLETED', resultUrl: null, thumbnailUrl: null, progress: 100, duration: 10, cost: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: 'job-2', prompt: 'Prompt 2', provider: 'p2', status: 'PENDING', resultUrl: null, thumbnailUrl: null, progress: 0, duration: null, cost: null, createdAt: new Date(), updatedAt: new Date() },
    ];

    it('should return paginated jobs for user', async () => {
      mockPrisma.videoJob.findMany.mockResolvedValue(mockJobs);
      mockPrisma.videoJob.count.mockResolvedValue(2);

      const result = await jobService.getUserJobs(userId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.videoJob.findMany.mockResolvedValue([mockJobs[0]]);
      mockPrisma.videoJob.count.mockResolvedValue(1);

      const result = await jobService.getUserJobs(userId, {
        page: 1,
        limit: 20,
        status: VideoStatus.COMPLETED as any,
      });

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.videoJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            status: VideoStatus.COMPLETED,
          }),
        }),
      );
    });

    it('should filter by provider', async () => {
      mockPrisma.videoJob.findMany.mockResolvedValue([mockJobs[0]]);
      mockPrisma.videoJob.count.mockResolvedValue(1);

      const result = await jobService.getUserJobs(userId, {
        page: 1,
        limit: 20,
        provider: 'p1',
      });

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.videoJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            provider: 'p1',
          }),
        }),
      );
    });

    it('should handle empty results', async () => {
      mockPrisma.videoJob.findMany.mockResolvedValue([]);
      mockPrisma.videoJob.count.mockResolvedValue(0);

      const result = await jobService.getUserJobs(userId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should enforce maximum limit of 100', async () => {
      mockPrisma.videoJob.findMany.mockResolvedValue([]);
      mockPrisma.videoJob.count.mockResolvedValue(0);

      await jobService.getUserJobs(userId, { page: 1, limit: 500 });

      expect(mockPrisma.videoJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status', async () => {
      mockPrisma.videoJob.findUnique.mockResolvedValue(mockJob);
      mockPrisma.videoJob.update.mockResolvedValue(mockJob);

      await jobService.updateJobStatus('job-123', {
        status: VideoStatus.PROCESSING as any,
        progress: 50,
      });

      expect(mockPrisma.videoJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-123' },
          data: expect.objectContaining({
            status: VideoStatus.PROCESSING,
            progress: 50,
          }),
        }),
      );
    });

    it('should throw NotFoundError for nonexistent job', async () => {
      mockPrisma.videoJob.findUnique.mockResolvedValue(null);

      await expect(
        jobService.updateJobStatus('nonexistent', { status: VideoStatus.COMPLETED as any }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteJob', () => {
    it('should delete a job owned by the user', async () => {
      mockPrisma.videoJob.findUnique.mockResolvedValue(mockJob);
      mockPrisma.videoJob.delete.mockResolvedValue(mockJob);

      await jobService.deleteJob('job-123', userId);

      expect(mockPrisma.videoJob.delete).toHaveBeenCalledWith({ where: { id: 'job-123' } });
    });

    it('should throw NotFoundError for nonexistent job', async () => {
      mockPrisma.videoJob.findUnique.mockResolvedValue(null);

      await expect(jobService.deleteJob('nonexistent', userId)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when user does not own the job', async () => {
      mockPrisma.videoJob.findUnique.mockResolvedValue(mockJob);

      await expect(jobService.deleteJob('job-123', otherUserId)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when job is processing', async () => {
      mockPrisma.videoJob.findUnique.mockResolvedValue({
        ...mockJob,
        status: VideoStatus.PROCESSING,
      });

      await expect(jobService.deleteJob('job-123', userId)).rejects.toThrow(ValidationError);
      await expect(jobService.deleteJob('job-123', userId)).rejects.toThrow('Cannot delete a job that is currently processing');
    });
  });

  describe('getJobStats', () => {
    it('should return correct stats', async () => {
      mockPrisma.videoJob.groupBy.mockResolvedValue([
        { status: VideoStatus.COMPLETED, _count: { id: 10 }, _sum: { cost: 50 }, _avg: { duration: 15 } },
        { status: VideoStatus.PENDING, _count: { id: 5 }, _sum: { cost: null }, _avg: { duration: null } },
        { status: VideoStatus.FAILED, _count: { id: 3 }, _sum: { cost: null }, _avg: { duration: null } },
      ]);

      const stats = await jobService.getJobStats(userId);

      expect(stats.total).toBe(18);
      expect(stats.completed).toBe(10);
      expect(stats.pending).toBe(5);
      expect(stats.failed).toBe(3);
      expect(stats.totalCost).toBe(50);
      expect(stats.avgDuration).toBe(15);
    });

    it('should return zero stats when no jobs exist', async () => {
      mockPrisma.videoJob.groupBy.mockResolvedValue([]);

      const stats = await jobService.getJobStats(userId);

      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.processing).toBe(0);
      expect(stats.cancelled).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.avgDuration).toBe(0);
    });
  });
});
