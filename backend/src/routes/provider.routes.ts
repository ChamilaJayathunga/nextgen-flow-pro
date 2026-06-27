import { Router, Response, NextFunction } from 'express';
import { authenticate, requireRole, AuthRequest } from '../core/auth/index.js';
import { providerRegistry } from '../providers/registry.js';
import { analyticsService } from '../services/analytics.service.js';
import { NotFoundError } from '../core/error-handler/index.js';

const router = Router();

router.get('/', authenticate, (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const allProviders = providerRegistry.getAll();
    const providers = allProviders.map((p) => {
      const metrics = providerRegistry.getMetrics(p.name);
      return {
        name: p.name,
        displayName: p.displayName,
        capabilities: p.capabilities,
        isAvailable: p.isAvailable,
        metrics: metrics
          ? {
              successRate: metrics.successRate,
              avgLatency: metrics.avgLatency,
              totalJobs: metrics.totalJobs,
              lastUsedAt: metrics.lastUsedAt,
            }
          : null,
      };
    });

    res.json({
      status: 'success',
      data: { providers },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats/performance', authenticate, requireRole('ADMIN'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const performance = await analyticsService.getProviderPerformance();

    res.json({
      status: 'success',
      data: { performance },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:name', authenticate, (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;

    let provider;
    try {
      provider = providerRegistry.get(name);
    } catch {
      throw new NotFoundError(`Provider "${name}" not found`);
    }

    const metrics = providerRegistry.getMetrics(name);

    res.json({
      status: 'success',
      data: {
        provider: {
          name: provider.name,
          displayName: provider.displayName,
          capabilities: provider.capabilities,
          baseUrl: provider.baseUrl,
          isAvailable: provider.isAvailable,
          metrics: metrics
            ? {
                successRate: metrics.successRate,
                avgLatency: metrics.avgLatency,
                totalJobs: metrics.totalJobs,
                lastUsedAt: metrics.lastUsedAt,
              }
            : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
