import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../core/auth/index.js';
import { validateQuery } from '../middleware/validate.js';
import { analyticsService } from '../services/analytics.service.js';

const prisma = new PrismaClient();
const router = Router();

router.use(authenticate);

const timeRangeSchema = z.object({
  days: z.coerce.number().int().positive().max(365).optional().default(30),
});

router.get('/usage', validateQuery(timeRangeSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { days } = req.query as unknown as { days: number };
    const userId = req.user!.userId;

    const stats = await analyticsService.getUserStats(userId);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const dailyUsage = await prisma.videoJob.groupBy({
      by: ['status'],
      where: {
        userId,
        createdAt: { gte: since },
      },
      _count: { id: true },
      _sum: { cost: true },
    });

    const allJobs = await prisma.videoJob.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, status: true, cost: true },
      orderBy: { createdAt: 'asc' },
    });

    const jobsByDayMap: Record<string, { date: string; count: number }> = {};
    for (const job of allJobs) {
      const dateStr = job.createdAt.toISOString().slice(0, 10);
      if (!jobsByDayMap[dateStr]) {
        jobsByDayMap[dateStr] = { date: dateStr, count: 0 };
      }
      jobsByDayMap[dateStr].count++;
    }

    res.json({
      status: 'success',
      data: {
        summary: stats,
        dailyUsage: dailyUsage.map((d) => ({
          status: d.status,
          count: d._count.id,
          cost: d._sum.cost ?? 0,
        })),
        jobsByDay: Object.values(jobsByDayMap),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/providers', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const providerUsage = await prisma.videoJob.groupBy({
      by: ['provider', 'status'],
      where: { userId },
      _count: { id: true },
      _sum: { cost: true },
      _avg: { duration: true },
    });

    const breakdown: Record<string, {
      provider: string;
      total: number;
      completed: number;
      failed: number;
      cancelled: number;
      totalCost: number;
      avgDuration: number | null;
    }> = {};

    for (const entry of providerUsage) {
      if (!breakdown[entry.provider]) {
        breakdown[entry.provider] = {
          provider: entry.provider,
          total: 0,
          completed: 0,
          failed: 0,
          cancelled: 0,
          totalCost: 0,
          avgDuration: null,
        };
      }
      breakdown[entry.provider].total += entry._count.id;
      if (entry.status === 'COMPLETED') {
        breakdown[entry.provider].completed = entry._count.id;
        breakdown[entry.provider].totalCost += entry._sum.cost ?? 0;
        breakdown[entry.provider].avgDuration = entry._avg.duration;
      } else if (entry.status === 'FAILED') {
        breakdown[entry.provider].failed = entry._count.id;
      } else if (entry.status === 'CANCELLED') {
        breakdown[entry.provider].cancelled = entry._count.id;
      }
    }

    res.json({
      status: 'success',
      data: {
        providers: Object.values(breakdown).sort((a, b) => b.total - a.total),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/trends', validateQuery(timeRangeSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { days } = req.query as unknown as { days: number };
    const userId = req.user!.userId;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const jobs = await prisma.videoJob.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, status: true, cost: true },
      orderBy: { createdAt: 'asc' },
    });

    const trendsMap: Record<string, {
      date: string;
      total: number;
      completed: number;
      failed: number;
      pending: number;
      processing: number;
      cancelled: number;
      cost: number;
    }> = {};

    for (const job of jobs) {
      const dateStr = job.createdAt.toISOString().slice(0, 10);
      if (!trendsMap[dateStr]) {
        trendsMap[dateStr] = {
          date: dateStr,
          total: 0,
          completed: 0,
          failed: 0,
          pending: 0,
          processing: 0,
          cancelled: 0,
          cost: 0,
        };
      }
      trendsMap[dateStr].total++;
      trendsMap[dateStr].cost += job.cost ?? 0;
      switch (job.status) {
        case 'COMPLETED': trendsMap[dateStr].completed++; break;
        case 'FAILED': trendsMap[dateStr].failed++; break;
        case 'PENDING': trendsMap[dateStr].pending++; break;
        case 'PROCESSING': trendsMap[dateStr].processing++; break;
        case 'CANCELLED': trendsMap[dateStr].cancelled++; break;
      }
    }

    res.json({
      status: 'success',
      data: {
        trends: Object.values(trendsMap).sort((a, b) => a.date.localeCompare(b.date)),
        period: `${days}d`,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
