import { providerRegistry } from '../providers/registry.js';
import { GenerateVideoOptions, VideoJobStatus, Provider } from '../providers/interface.js';
import { ProviderError } from '../core/error-handler/index.js';
import { logger } from '../core/logger/index.js';
import { config } from '../core/config/index.js';

interface FallbackResult {
  success: boolean;
  result?: VideoJobStatus;
  error?: string;
  provider: string;
  attempts: ProviderAttempt[];
}

interface ProviderAttempt {
  provider: string;
  success: boolean;
  latency: number;
  error?: string;
}

export class ProviderService {
  private fallbackEnabled: boolean;

  constructor(fallbackEnabled = true) {
    this.fallbackEnabled = fallbackEnabled;
  }

  async generateVideo(prompt: string, options: GenerateVideoOptions = {}): Promise<VideoJobStatus> {
    const fullOptions: GenerateVideoOptions = { prompt, ...options };
    const preferredProvider = options.provider as string | undefined;
    let provider: Provider;

    if (preferredProvider) {
      try {
        provider = providerRegistry.get(preferredProvider);
      } catch {
        throw new ProviderError(
          `Preferred provider "${preferredProvider}" not found in registry`,
          preferredProvider,
        );
      }
      if (!provider.isAvailable) {
        throw new ProviderError(
          `Preferred provider "${preferredProvider}" is currently unavailable`,
          preferredProvider,
        );
      }
      return this.executeWithMetrics(provider, fullOptions);
    }

    if (this.fallbackEnabled) {
      return this.executeWithFallback(fullOptions);
    }

    provider = providerRegistry.getBest();
    return this.executeWithMetrics(provider, fullOptions);
  }

  private async executeWithFallback(options: GenerateVideoOptions): Promise<VideoJobStatus> {
    const available = providerRegistry.getAvailable();

    if (available.length === 0) {
      throw new Error('No video generation providers are currently available');
    }

    const ordered = [...available].sort((a, b) => {
      const metricsA = providerRegistry.getMetrics(a.name);
      const metricsB = providerRegistry.getMetrics(b.name);
      const scoreA = (metricsA?.successRate ?? 1) * 100 + (metricsA?.totalJobs ?? 0);
      const scoreB = (metricsB?.successRate ?? 1) * 100 + (metricsB?.totalJobs ?? 0);
      return scoreB - scoreA;
    });

    const result: FallbackResult = {
      success: false,
      provider: '',
      attempts: [],
    };

    for (const provider of ordered) {
      try {
        const startTime = Date.now();
        const status = await this.executeWithMetrics(provider, options);
        const latency = Date.now() - startTime;

        result.attempts.push({
          provider: provider.name,
          success: true,
          latency,
        });
        result.success = true;
        result.result = status;
        result.provider = provider.name;

        logger.info(`Fallback succeeded with provider: ${provider.name}`, {
          latency,
          attempt: result.attempts.length,
        });

        return status;
      } catch (error) {
        const latency = 0;
        result.attempts.push({
          provider: provider.name,
          success: false,
          latency,
          error: error instanceof Error ? error.message : String(error),
        });

        logger.warn(`Fallback attempt failed for provider: ${provider.name}`, {
          error: error instanceof Error ? error.message : String(error),
          attempt: result.attempts.length,
        });
      }
    }

    result.provider = ordered[0]?.name ?? 'none';

    throw new Error(
      `All providers failed. Attempts: ${result.attempts
        .map((a) => `${a.provider}: ${a.error}`)
        .join('; ')}`,
    );
  }

  private async executeWithMetrics(
    provider: Provider,
    options: GenerateVideoOptions,
  ): Promise<VideoJobStatus> {
    const startTime = Date.now();

    try {
      const status = await provider.generateVideo(options);
      const latency = Date.now() - startTime;

      providerRegistry.updateMetrics(provider.name, true, latency);

      logger.info(`Video generation successful via ${provider.name}`, {
        jobId: status.jobId,
        latency,
        prompt: options.prompt.substring(0, 100),
      });

      return status;
    } catch (error) {
      const latency = Date.now() - startTime;
      providerRegistry.updateMetrics(provider.name, false, latency);

      logger.error(`Video generation failed via ${provider.name}`, {
        error: error instanceof Error ? error.message : String(error),
        latency,
      });

      throw new ProviderError(
        `Provider ${provider.name} failed: ${error instanceof Error ? error.message : String(error)}`,
        provider.name,
      );
    }
  }

  async getJobStatus(providerName: string, jobId: string): Promise<VideoJobStatus> {
    const provider = providerRegistry.get(providerName);
    return provider.getStatus(jobId);
  }

  async cancelJob(providerName: string, jobId: string): Promise<boolean> {
    const provider = providerRegistry.get(providerName);
    return provider.cancelJob(jobId);
  }

  getBestProvider(): Provider {
    return providerRegistry.getBest();
  }

  estimateCost(providerName: string, options: GenerateVideoOptions): number {
    const duration = options.duration ?? 5;
    const resolution = options.resolution ?? '720p';
    const baseRate = this.getBaseRate(providerName);

    let cost = baseRate;
    cost += duration * 0.02;

    if (resolution === '1080p') {
      cost *= 1.5;
    } else if (resolution === '4k') {
      cost *= 3;
    }

    if (options.style) {
      cost *= 1.1;
    }

    if (options.imageUrl) {
      cost *= 1.2;
    }

    if (options.videoRefUrl) {
      cost *= 1.3;
    }

    return Math.round(cost * 100) / 100;
  }

  private getBaseRate(providerName: string): number {
    const rates: Record<string, number> = {
      googleFlow: 0.05,
      openai: 0.08,
      runway: 0.06,
      pika: 0.04,
      luma: 0.07,
      kling: 0.03,
      pixverse: 0.02,
      hailuo: 0.04,
      stability: 0.06,
      replicate: 0.05,
      fal: 0.03,
    };
    return rates[providerName] ?? 0.05;
  }
}

export const providerService = new ProviderService();
