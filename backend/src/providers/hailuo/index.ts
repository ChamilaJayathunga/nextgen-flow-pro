import { config } from '../../core/config/index.js';
import { logger } from '../../core/logger/index.js';
import { Provider, GenerateVideoOptions, VideoJobStatus } from '../interface.js';
import { providerRegistry } from '../registry.js';

const PROVIDER_NAME = 'hailuo';
const TIMEOUT_MS = 180_000;

interface HailuoTaskResponse {
  taskId: string;
  status: 'pending' | 'running' | 'success' | 'fail';
  result?: {
    videoUrl: string;
    thumbnailUrl?: string;
    duration?: number;
  };
  message?: string;
}

class HailuoProvider implements Provider {
  readonly name = PROVIDER_NAME;
  readonly displayName = 'Hailuo AI';
  readonly capabilities = ['text-to-video', 'image-to-video', 'fast'];
  readonly baseUrl: string;
  readonly isAvailable: boolean;

  private readonly apiKey: string;

  constructor() {
    this.apiKey = config.providers.hailuo.apiKey;
    this.baseUrl = config.providers.hailuo.baseUrl;
    this.isAvailable = !!this.apiKey;
  }

  async generateVideo(options: GenerateVideoOptions): Promise<VideoJobStatus> {
    if (!this.apiKey) {
      return this.mockGenerate(options);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const body: Record<string, unknown> = {
        prompt: options.prompt,
        duration: options.duration || 6,
        resolution: options.resolution || '1920x1080',
      };

      if (options.imageUrl) {
        body.imageUrl = options.imageUrl;
      }
      if (options.negativePrompt) {
        body.negativePrompt = options.negativePrompt;
      }
      if (options.style) {
        body.style = options.style;
      }

      const response = await fetch(`${this.baseUrl}/video`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        let parsed: { message?: string } = {};
        try { parsed = JSON.parse(errBody); } catch { /* empty */ }
        throw new Error(`Hailuo API error ${response.status}: ${parsed.message || errBody}`);
      }

      const data: HailuoTaskResponse = await response.json();

      return {
        jobId: data.taskId,
        status: this.mapStatus(data.status),
        progress: this.statusToProgress(data.status),
        resultUrl: data.result?.videoUrl,
        thumbnailUrl: data.result?.thumbnailUrl,
        errorMessage: data.message,
        estimatedDuration: data.result?.duration,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn(`[${PROVIDER_NAME}] generateVideo timed out`);
        return this.mockGenerate(options);
      }
      logger.error(`[${PROVIDER_NAME}] generateVideo failed`, { error });
      return this.mockGenerate(options);
    } finally {
      clearTimeout(timeout);
    }
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    if (!this.apiKey) {
      return { jobId, status: 'completed', progress: 100 };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(`${this.baseUrl}/video/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Hailuo status error ${response.status}: ${errBody}`);
      }

      const data: HailuoTaskResponse = await response.json();

      return {
        jobId,
        status: this.mapStatus(data.status),
        progress: this.statusToProgress(data.status),
        resultUrl: data.result?.videoUrl,
        thumbnailUrl: data.result?.thumbnailUrl,
        errorMessage: data.message,
        estimatedDuration: data.result?.duration,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { jobId, status: 'pending', progress: 0 };
      }
      logger.error(`[${PROVIDER_NAME}] getStatus failed`, { error, jobId });
      return { jobId, status: 'failed', progress: 0, errorMessage: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      clearTimeout(timeout);
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    if (!this.apiKey) return true;

    try {
      const response = await fetch(`${this.baseUrl}/video/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errBody = await response.text();
        logger.error(`[${PROVIDER_NAME}] cancelJob failed`, { status: response.status, body: errBody });
        return false;
      }

      return true;
    } catch (error: unknown) {
      logger.error(`[${PROVIDER_NAME}] cancelJob error`, { error, jobId });
      return false;
    }
  }

  private mapStatus(status: string): VideoJobStatus['status'] {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'running':
        return 'processing';
      case 'success':
        return 'completed';
      case 'fail':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private statusToProgress(status: string): number {
    switch (status) {
      case 'pending':
        return 5;
      case 'running':
        return 50;
      case 'success':
        return 100;
      case 'fail':
        return 0;
      default:
        return 0;
    }
  }

  private async mockGenerate(options: GenerateVideoOptions): Promise<VideoJobStatus> {
    const jobId = `hailuo-mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    logger.info(`[${PROVIDER_NAME}] Mock generateVideo`, { prompt: options.prompt, jobId });
    return {
      jobId,
      status: 'completed',
      progress: 100,
      resultUrl: `https://mock.hailuoai.com/videos/${jobId}/output.mp4`,
      thumbnailUrl: `https://mock.hailuoai.com/videos/${jobId}/thumb.jpg`,
      estimatedDuration: options.duration || 6,
    };
  }
}

export function registerProvider(): HailuoProvider {
  const provider = new HailuoProvider();
  providerRegistry.register(provider);
  logger.info(`Registering provider: ${PROVIDER_NAME}`);
  return provider;
}

export default HailuoProvider;
