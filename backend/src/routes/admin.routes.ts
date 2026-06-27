import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole, AuthRequest } from '../core/auth/index.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { jobService } from '../services/job.service.js';
import { analyticsService } from '../services/analytics.service.js';
import { hashPassword } from '../core/auth/index.js';
import { NotFoundError, ValidationError } from '../core/error-handler/index.js';
import { logger } from '../core/logger/index.js';

const prisma = new PrismaClient();
const router = Router();

router.use(authenticate, requireRole('ADMIN'));

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional(),
  credits: z.number().int().min(0).optional(),
});

const updateJobSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  resultUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
  progress: z.number().int().min(0).max(100).optional(),
  cost: z.number().min(0).optional(),
});

router.get('/users', validateQuery(paginationSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true, plan: true,
          credits: true, emailVerified: true, createdAt: true, updatedAt: true,
          _count: { select: { videoJobs: true } },
        },
      }),
      prisma.user.count(),
    ]);

    res.json({
      status: 'success',
      data: {
        users: data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, role: true, plan: true,
        credits: true, image: true, emailVerified: true,
        createdAt: true, updatedAt: true,
        _count: { select: { videoJobs: true, favorites: true } },
      },
    });

    if (!user) {
      throw new NotFoundError(`User ${req.params.id} not found`);
    }

    res.json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/users/:id', validate(updateUserSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData: Record<string, unknown> = {};

    const fields = ['name', 'email', 'role', 'plan', 'credits'] as const;
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`User ${id} not found`);
    }

    if (updateData.email && updateData.email !== existing.email) {
      const emailExists = await prisma.user.findFirst({
        where: { email: updateData.email as string, id: { not: id } },
      });
      if (emailExists) {
        throw new ValidationError('Email already in use', { email: ['Email is taken by another user'] });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, name: true, email: true, role: true, plan: true,
        credits: true, updatedAt: true,
      },
    });

    logger.info(`Admin updated user`, { adminId: req.user!.userId, targetUserId: id });

    res.json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`User ${id} not found`);
    }

    if (id === req.user!.userId) {
      throw new ValidationError('Cannot delete your own admin account');
    }

    await prisma.user.delete({ where: { id } });

    logger.info(`Admin deleted user`, { adminId: req.user!.userId, targetUserId: id });

    res.json({
      status: 'success',
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await analyticsService.getSystemStats(30);

    const [activeUsers, totalRevenue] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
      prisma.videoJob.aggregate({
        _sum: { cost: true },
        where: { status: 'COMPLETED' },
      }),
    ]);

    res.json({
      status: 'success',
      data: {
        ...stats,
        newUsers30d: activeUsers,
        totalRevenue: totalRevenue._sum.cost ?? 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/jobs', validateQuery(paginationSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status, provider } = req.query as unknown as {
      page: number; limit: number; status?: string; provider?: string;
    };

    const result = await jobService.getAllJobs({ page, limit, status, provider });

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/jobs/:id', validate(updateJobSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await jobService.updateJobStatus(id, req.body);

    const job = await jobService.getJob(id);

    logger.info(`Admin updated job`, { adminId: req.user!.userId, jobId: id });

    res.json({
      status: 'success',
      data: { job },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
