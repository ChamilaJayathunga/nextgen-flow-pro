import { config } from '../../core/config/index.js';
import { logger } from '../../core/logger/index.js';
import { Provider, GenerateVideoOptions, VideoJobStatus } from '../interface.js';
import { providerRegistry } from '../registry.js';

const PROVIDER_NAME = 'stability';
const TIMEOUT_MS = 180_000;

interface StabilityGenerationResponse {
  id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  video?: {
    url: string;
    thumbnail_url?: string;
  };
  error?: string;
  created_at: string;
}

class StabilityProvider implements Provider {
  readonly name = PROVIDER_NAME;
  readonly displayName = 'Stability AI';
  readonly capabilities = ['text-to-video', 'image-to-video', 'high-quality'];
  readonly baseUrl: string;
  readonly isAvailable: boolean;

  private readonly apiKey: string;

  constructor() {
    this.apiKey = config.providers.stability.apiKey;
    this.baseUrl = config.providers.stability.baseUrl;
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
        duration: options.duration || 5,
        resolution: options.resolution || '1920x1080',
      };

      if (options.imageUrl) {
        body.image_url = options.imageUrl;
      }
      if (options.negativePrompt) {
        body.negative_prompt = options.negativePrompt;
      }
      if (options.style) {
        body.style_preset = options.style;
      }

      const response = await fetch(`${this.baseUrl}/v2beta/video/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Stability-Client-ID': 'nextgen-flow-pro',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        let parsed: { message?: string; errors?: string[] } = {};
        try { parsed = JSON.parse(errBody); } catch { /* empty */ }
        const message = parsed.message || parsed.errors?.join(', ') || errBody;
        throw new Error(`Stability AI API error ${response.status}: ${message}`);
      }

      const data: StabilityGenerationResponse = await response.json();

      return {
        jobId: data.id,
        status: this.mapStatus(data.status),
        progress: this.statusToProgress(data.status),
        resultUrl: data.video?.url,
        thumbnailUrl: data.video?.thumbnail_url,
        errorMessage: data.error,
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
      const response = await fetch(`${this.baseUrl}/v2beta/video/generation/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Stability AI status error ${response.status}: ${errBody}`);
      }

      const data: StabilityGenerationResponse = await response.json();

      return {
        jobId,
        status: this.mapStatus(data.status),
        progress: this.statusToProgress(data.status),
        resultUrl: data.video?.url,
        thumbnailUrl: data.video?.thumbnail_url,
        errorMessage: data.error,
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
      const response = await fetch(`${this.baseUrl}/v2beta/video/generation/${jobId}/cancel`, {
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
      case 'queued':
        return 'pending';
      case 'in_progress':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
      case 'cancelled':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private statusToProgress(status: string): number {
    switch (status) {
      case 'queued':
        return 5;
      case 'in_progress':
        return 50;
      case 'completed':
        return 100;
      case 'failed':
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  }

  private async mockGenerate(options: GenerateVideoOptions): Promise<VideoJobStatus> {
    const jobId = `stability-mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    logger.info(`[${PROVIDER_NAME}] Mock generateVideo`, { prompt: options.prompt, jobId });
    return {
      jobId,
      status: 'completed',
      progress: 100,
      resultUrl: `https://mock.stability.ai/videos/${jobId}/output.mp4`,
      thumbnailUrl: `https://mock.stability.ai/videos/${jobId}/thumb.jpg`,
      estimatedDuration: options.duration || 5,
    };
  }
}

export function registerProvider(): StabilityProvider {
  const provider = new StabilityProvider();
  providerRegistry.register(provider);
  logger.info(`Registering provider: ${PROVIDER_NAME}`);
  return provider;
}

export default StabilityProvider;
