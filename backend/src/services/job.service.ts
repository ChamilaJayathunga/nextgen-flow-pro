import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../core/logger/index.js';
import { NotFoundError, ValidationError } from '../core/error-handler/index.js';

const prisma = new PrismaClient();

interface CreateJobInput {
  userId: string;
  prompt: string;
  provider: string;
  enhancedPrompt?: string;
  imageUrl?: string;
  videoRefUrl?: string;
  parameters?: Record<string, unknown>;
}

interface UpdateJobInput {
  status?: string;
  resultUrl?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  videoRefUrl?: string;
  enhancedPrompt?: string;
  errorMessage?: string;
  progress?: number;
  duration?: number;
  cost?: number;
  startedAt?: Date;
  completedAt?: Date;
}

interface JobStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalCost: number;
  avgDuration: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class JobService {
  async createJob(input: CreateJobInput): Promise<{
    id: string;
    userId: string;
    prompt: string;
    provider: string;
    status: string;
    createdAt: Date;
  }> {
    const job = await prisma.videoJob.create({
      data: {
        id: uuidv4(),
        userId: input.userId,
        prompt: input.prompt,
        provider: input.provider,
        enhancedPrompt: input.enhancedPrompt,
        imageUrl: input.imageUrl,
        videoRefUrl: input.videoRefUrl,
        parameters: input.parameters ? JSON.stringify(input.parameters) : null,
        status: 'PENDING',
        progress: 0,
      },
      select: {
        id: true,
        userId: true,
        prompt: true,
        provider: true,
        status: true,
        createdAt: true,
      },
    });

    logger.info(`Video job created`, { jobId: job.id, userId: input.userId, provider: input.provider });
    return job;
  }

  async getJob(jobId: string, userId?: string): Promise<any> {
    const job = await prisma.videoJob.findUnique({
      where: { id: jobId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundError(`Video job ${jobId} not found`);
    }

    if (userId && job.userId !== userId) {
      throw new NotFoundError(`Video job ${jobId} not found`);
    }

    return job;
  }

  async getUserJobs(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      provider?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ): Promise<PaginatedResult<any>> {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (options.status) {
      where.status = options.status;
    }

    if (options.provider) {
      where.provider = options.provider;
    }

    const orderBy: any = {};
    const sortField = options.sortBy ?? 'createdAt';
    const sortOrder = options.sortOrder ?? 'desc';

    if (['createdAt', 'updatedAt', 'status', 'progress', 'duration', 'cost'].includes(sortField)) {
      orderBy[sortField] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      prisma.videoJob.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          prompt: true,
          provider: true,
          status: true,
          resultUrl: true,
          thumbnailUrl: true,
          progress: true,
          duration: true,
          cost: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.videoJob.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateJobStatus(jobId: string, input: UpdateJobInput): Promise<void> {
    const existing = await prisma.videoJob.findUnique({ where: { id: jobId } });
    if (!existing) {
      throw new NotFoundError(`Video job ${jobId} not found`);
    }

    const updateData: any = {};

    if (input.status !== undefined) updateData.status = input.status;
    if (input.resultUrl !== undefined) updateData.resultUrl = input.resultUrl;
    if (input.thumbnailUrl !== undefined) updateData.thumbnailUrl = input.thumbnailUrl;
    if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
    if (input.videoRefUrl !== undefined) updateData.videoRefUrl = input.videoRefUrl;
    if (input.enhancedPrompt !== undefined) updateData.enhancedPrompt = input.enhancedPrompt;
    if (input.errorMessage !== undefined) updateData.errorMessage = input.errorMessage;
    if (input.progress !== undefined) updateData.progress = input.progress;
    if (input.duration !== undefined) updateData.duration = input.duration;
    if (input.cost !== undefined) updateData.cost = input.cost;
    if (input.startedAt !== undefined) updateData.startedAt = input.startedAt;
    if (input.completedAt !== undefined) updateData.completedAt = input.completedAt;

    await prisma.videoJob.update({
      where: { id: jobId },
      data: updateData,
    });

    logger.info(`Video job ${jobId} status updated`, {
      status: input.status,
      progress: input.progress,
    });

    if (input.status === 'COMPLETED' || input.status === 'FAILED') {
      await this.updateProviderUsage(jobId, input.status);
    }
  }

  private async updateProviderUsage(jobId: string, status: string): Promise<void> {
    try {
      const job = await prisma.videoJob.findUnique({
        where: { id: jobId },
        select: { provider: true },
      });

      if (!job) return;

      const provider = job.provider;
      const existing = await prisma.providerUsage.findFirst({
        where: { provider },
      });

      if (existing) {
        await prisma.providerUsage.update({
          where: { id: existing.id },
          data: {
            totalJobs: { increment: 1 },
            ...(status === 'COMPLETED'
              ? { successCount: { increment: 1 } }
              : { failCount: { increment: 1 } }),
            lastUsedAt: new Date(),
          },
        });
      } else {
        await prisma.providerUsage.create({
          data: {
            provider,
            totalJobs: 1,
            successCount: status === 'COMPLETED' ? 1 : 0,
            failCount: status === 'FAILED' ? 1 : 0,
            lastUsedAt: new Date(),
          },
        });
      }
    } catch (error) {
      logger.error('Failed to update provider usage', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async deleteJob(jobId: string, userId: string): Promise<void> {
    const job = await prisma.videoJob.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundError(`Video job ${jobId} not found`);
    }

    if (job.userId !== userId) {
      throw new NotFoundError(`Video job ${jobId} not found`);
    }

    if (job.status === 'PROCESSING') {
      throw new ValidationError('Cannot delete a job that is currently processing');
    }

    await prisma.videoJob.delete({ where: { id: jobId } });
    logger.info(`Video job ${jobId} deleted by user ${userId}`);
  }

  async getJobStats(userId: string): Promise<JobStats> {
    const stats = await prisma.videoJob.groupBy({
      by: ['status'],
      where: { userId },
      _count: { id: true },
      _sum: { cost: true },
      _avg: { duration: true },
    });

    const result: JobStats = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      totalCost: 0,
      avgDuration: 0,
    };

    for (const stat of stats) {
      const count = stat._count.id;
      result.total += count;

      switch (stat.status) {
        case 'PENDING':
          result.pending = count;
          break;
        case 'PROCESSING':
          result.processing = count;
          break;
        case 'COMPLETED':
          result.completed = count;
          result.totalCost += stat._sum.cost ?? 0;
          if (stat._avg.duration) {
            result.avgDuration = stat._avg.duration;
          }
          break;
        case 'FAILED':
          result.failed = count;
          break;
        case 'CANCELLED':
          result.cancelled = count;
          break;
      }
    }

    return result;
  }

  async getAllJobs(
    options: {
      page?: number;
      limit?: number;
      status?: string;
      provider?: string;
    } = {},
  ): Promise<PaginatedResult<any>> {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.status) where.status = options.status;
    if (options.provider) where.provider = options.provider;

    const [data, total] = await Promise.all([
      prisma.videoJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          prompt: true,
          provider: true,
          status: true,
          userId: true,
          progress: true,
          cost: true,
          createdAt: true,
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.videoJob.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const jobService = new JobService();
