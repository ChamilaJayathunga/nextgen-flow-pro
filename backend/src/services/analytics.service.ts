import { PrismaClient } from '@prisma/client';
import { logger } from '../core/logger/index.js';

const prisma = new PrismaClient();

interface ProviderPerformance {
  provider: string;
  successCount: number;
  failCount: number;
  totalJobs: number;
  successRate: number;
  avgLatency: number;
  lastUsedAt: Date | null;
}

interface UserStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalSpent: number;
  creditsUsed: number;
  favoriteCount: number;
  topProvider: string | null;
  avgJobDuration: number;
}

interface SystemStats {
  totalUsers: number;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalRevenue: number;
  totalCost: number;
  topProviders: { provider: string; count: number }[];
  jobsByDay: { date: string; count: number }[];
}

export class AnalyticsService {
  async trackProviderUsage(
    provider: string,
    success: boolean,
    latencyMs: number,
  ): Promise<void> {
    try {
      const existing = await prisma.providerUsage.findFirst({
        where: { provider },
      });

      if (existing) {
        const newTotalJobs = existing.totalJobs + 1;
        const newAvgLatency =
          (existing.avgLatency * existing.totalJobs + latencyMs) / newTotalJobs;

        await prisma.providerUsage.update({
          where: { id: existing.id },
          data: {
            totalJobs: { increment: 1 },
            successCount: success ? { increment: 1 } : undefined,
            failCount: success ? undefined : { increment: 1 },
            avgLatency: newAvgLatency,
            lastUsedAt: new Date(),
          },
        });
      } else {
        await prisma.providerUsage.create({
          data: {
            provider,
            totalJobs: 1,
            successCount: success ? 1 : 0,
            failCount: success ? 0 : 1,
            avgLatency: latencyMs,
            lastUsedAt: new Date(),
          },
        });
      }
    } catch (error) {
      logger.error('Failed to track provider usage', {
        provider,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const [videoStats, favoriteCount, topProviderResult] = await Promise.all([
      prisma.videoJob.groupBy({
        by: ['status'],
        where: { userId },
        _count: { id: true },
        _sum: { cost: true },
        _avg: { duration: true },
      }),
      prisma.userFavorite.count({
        where: { userId },
      }),
      prisma.videoJob.groupBy({
        by: ['provider'],
        where: { userId, status: 'COMPLETED' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      }),
    ]);

    const stats: UserStats = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      totalSpent: 0,
      creditsUsed: 0,
      favoriteCount,
      topProvider: topProviderResult[0]?.provider ?? null,
      avgJobDuration: 0,
    };

    for (const stat of videoStats) {
      stats.totalJobs += stat._count.id;

      switch (stat.status) {
        case 'COMPLETED':
          stats.completedJobs = stat._count.id;
          stats.totalSpent += stat._sum.cost ?? 0;
          if (stat._avg.duration) {
            stats.avgJobDuration = stat._avg.duration;
          }
          break;
        case 'FAILED':
          stats.failedJobs = stat._count.id;
          break;
      }
    }

    return stats;
  }

  async getSystemStats(days: number = 30): Promise<SystemStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);

    const [
      totalUsers,
      jobStats,
      revenueResult,
      topProviders,
      activeJobs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.videoJob.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { cost: true },
      }),
      prisma.videoJob.aggregate({
        _sum: { cost: true },
        where: { status: 'COMPLETED' },
      }),
      prisma.videoJob.groupBy({
        by: ['provider'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.videoJob.count({
        where: { status: 'PROCESSING' },
      }),
    ]);

    const allJobs = await prisma.videoJob.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
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

    const stats: SystemStats = {
      totalUsers,
      totalJobs: 0,
      activeJobs,
      completedJobs: 0,
      failedJobs: 0,
      totalRevenue: revenueResult._sum.cost ?? 0,
      totalCost: 0,
      topProviders: topProviders.map((p) => ({
        provider: p.provider,
        count: p._count.id,
      })),
      jobsByDay: Object.values(jobsByDayMap),
    };

    for (const stat of jobStats) {
      stats.totalJobs += stat._count.id;

      switch (stat.status) {
        case 'COMPLETED':
          stats.completedJobs = stat._count.id;
          break;
        case 'FAILED':
          stats.failedJobs = stat._count.id;
          break;
      }
    }

    return stats;
  }

  async getProviderPerformance(): Promise<ProviderPerformance[]> {
    const usages = await prisma.providerUsage.findMany({
      orderBy: { totalJobs: 'desc' },
    });

    return usages.map((u) => ({
      provider: u.provider,
      successCount: u.successCount,
      failCount: u.failCount,
      totalJobs: u.totalJobs,
      successRate: u.totalJobs > 0 ? u.successCount / u.totalJobs : 0,
      avgLatency: u.avgLatency,
      lastUsedAt: u.lastUsedAt,
    }));
  }

  async recordProviderLatency(provider: string, latencyMs: number): Promise<void> {
    try {
      const existing = await prisma.providerUsage.findFirst({
        where: { provider },
      });

      if (existing) {
        const newTotalJobs = existing.totalJobs + 1;
        const newAvgLatency =
          (existing.avgLatency * existing.totalJobs + latencyMs) / newTotalJobs;

        await prisma.providerUsage.update({
          where: { id: existing.id },
          data: {
            totalJobs: { increment: 1 },
            avgLatency: newAvgLatency,
            lastUsedAt: new Date(),
          },
        });
      } else {
        await prisma.providerUsage.create({
          data: {
            provider,
            totalJobs: 1,
            avgLatency: latencyMs,
            lastUsedAt: new Date(),
          },
        });
      }
    } catch (error) {
      logger.error('Failed to record provider latency', {
        provider,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const analyticsService = new AnalyticsService();
