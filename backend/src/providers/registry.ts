import { Provider, ProviderMetrics, GenerateVideoOptions, VideoJobStatus } from './interface.js';
import { config } from '../core/config/index.js';
import { logger } from '../core/logger/index.js';

class ProviderRegistry {
  private providers: Map<string, Provider> = new Map();
  private metrics: Map<string, ProviderMetrics> = new Map();
  private static instance: ProviderRegistry;

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  register(provider: Provider): void {
    if (!provider.name) {
      throw new Error('Provider must have a name');
    }
    this.providers.set(provider.name, provider);
    this.metrics.set(provider.name, {
      successRate: 1.0,
      avgLatency: 0,
      totalJobs: 0,
      lastUsedAt: new Date(),
      isAvailable: true,
    });
    logger.info(`Provider registered: ${provider.name}`);
  }

  get(name: string): Provider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider "${name}" not found in registry`);
    }
    return provider;
  }

  getAll(): Provider[] {
    return Array.from(this.providers.values());
  }

  getAvailable(): Provider[] {
    return this.getAll().filter((p) => {
      const metrics = this.metrics.get(p.name);
      return p.isAvailable && metrics && metrics.isAvailable;
    });
  }

  getBest(): Provider {
    const available = this.getAvailable();

    if (available.length === 0) {
      throw new Error('No available providers in registry');
    }

    const scored = available.map((provider) => {
      const metrics = this.metrics.get(provider.name)!;
      const successScore = metrics.successRate * 100;
      const latencyScore = metrics.avgLatency > 0
        ? Math.max(0, 100 - metrics.avgLatency / 100)
        : 50;
      const totalJobsScore = Math.min(metrics.totalJobs / 10, 20);

      const score = successScore * 3 + latencyScore * 2 + totalJobsScore;

      return { provider, score };
    });

    scored.sort((a, b) => b.score - a.score);

    logger.debug('Provider scores', {
      scores: scored.map((s) => ({ name: s.provider.name, score: s.score })),
    });

    return scored[0].provider;
  }

  remove(name: string): boolean {
    const removed = this.providers.delete(name);
    this.metrics.delete(name);
    if (removed) {
      logger.info(`Provider removed from registry: ${name}`);
    }
    return removed;
  }

  updateMetrics(name: string, success: boolean, latency: number): void {
    const metrics = this.metrics.get(name);
    if (!metrics) return;

    metrics.totalJobs++;

    if (success) {
      metrics.successRate =
        (metrics.successRate * (metrics.totalJobs - 1) + 1) / metrics.totalJobs;
    } else {
      metrics.successRate =
        (metrics.successRate * (metrics.totalJobs - 1) + 0) / metrics.totalJobs;
    }

    metrics.avgLatency =
      (metrics.avgLatency * (metrics.totalJobs - 1) + latency) / metrics.totalJobs;

    metrics.lastUsedAt = new Date();

    this.metrics.set(name, metrics);
    logger.debug(`Metrics updated for ${name}`, metrics);
  }

  getMetrics(name: string): ProviderMetrics | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): Map<string, ProviderMetrics> {
    return new Map(this.metrics);
  }

  setAvailability(name: string, available: boolean): void {
    const metrics = this.metrics.get(name);
    if (metrics) {
      metrics.isAvailable = available;
      this.metrics.set(name, metrics);
      logger.info(`Provider ${name} availability set to ${available}`);
    }
  }

  clear(): void {
    this.providers.clear();
    this.metrics.clear();
    logger.info('Provider registry cleared');
  }
}

export const providerRegistry = ProviderRegistry.getInstance();
