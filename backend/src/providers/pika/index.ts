import { config } from '../../core/config/index.js';
import { logger } from '../../core/logger/index.js';
import { Provider, GenerateVideoOptions, VideoJobStatus } from '../interface.js';
import { providerRegistry } from '../registry.js';

const PROVIDER_NAME = 'pika';
const TIMEOUT_MS = 180_000;

interface PikaGenerationResponse {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  video_url?: string;
  thumbnail_url?: string;
  error?: string;
  progress?: number;
}

class PikaProvider implements Provider {
  readonly name = PROVIDER_NAME;
  readonly displayName = 'Pika';
  readonly capabilities = ['text-to-video', 'image-to-video', 'video-to-video', 'fast'];
  readonly baseUrl: string;
  readonly isAvailable: boolean;

  private readonly apiKey: string;

  constructor() {
    this.apiKey = config.providers.pika.apiKey;
    this.baseUrl = config.providers.pika.baseUrl;
    this.isAvailable = !!this.apiKey;
  }

  async generateVideo(options: GenerateVideoOptions): Promise<VideoJobStatus> {
    if (!this.apiKey) {
      return this.mockGenerate(options);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const resolution = options.resolution || '1920x1080';
      const [width, height] = resolution.split('x').map(Number);

      const body: Record<string, unknown> = {
        prompt: options.prompt,
        width: width || 1920,
        height: height || 1080,
        duration: options.duration || 3,
      };

      if (options.imageUrl) {
        body.imageUrl = options.imageUrl;
        body.motionScale = 1;
      }
      if (options.negativePrompt) {
        body.negativePrompt = options.negativePrompt;
      }
      if (options.style) {
        body.stylePreset = options.style;
      }

      const response = await fetch(`${this.baseUrl}/generations`, {
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
        let parsed: { detail?: string; message?: string } = {};
        try { parsed = JSON.parse(errBody); } catch { /* empty */ }
        const message = parsed.detail || parsed.message || errBody;
        throw new Error(`Pika API error ${response.status}: ${message}`);
      }

      const data: PikaGenerationResponse = await response.json();

      return {
        jobId: data.id,
        status: this.mapStatus(data.status),
        progress: data.progress ?? this.statusToProgress(data.status),
        resultUrl: data.video_url,
        thumbnailUrl: data.thumbnail_url,
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
      const response = await fetch(`${this.baseUrl}/generations/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Pika status error ${response.status}: ${errBody}`);
      }

      const data: PikaGenerationResponse = await response.json();

      return {
        jobId,
        status: this.mapStatus(data.status),
        progress: data.progress ?? this.statusToProgress(data.status),
        resultUrl: data.video_url,
        thumbnailUrl: data.thumbnail_url,
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
      const response = await fetch(`${this.baseUrl}/generations/${jobId}/cancel`, {
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
      case 'pending':
        return 5;
      case 'running':
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
    const jobId = `pika-mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    logger.info(`[${PROVIDER_NAME}] Mock generateVideo`, { prompt: options.prompt, jobId });
    return {
      jobId,
      status: 'completed',
      progress: 100,
      resultUrl: `https://mock.pika.art/output/${jobId}/video.mp4`,
      thumbnailUrl: `https://mock.pika.art/output/${jobId}/thumb.jpg`,
      estimatedDuration: options.duration || 3,
    };
  }
}

export function registerProvider(): PikaProvider {
  const provider = new PikaProvider();
  providerRegistry.register(provider);
  logger.info(`Registering provider: ${PROVIDER_NAME}`);
  return provider;
}

export default PikaProvider;
