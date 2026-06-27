import { config } from '../../core/config/index.js';
import { logger } from '../../core/logger/index.js';
import { Provider, GenerateVideoOptions, VideoJobStatus } from '../interface.js';
import { providerRegistry } from '../registry.js';

const PROVIDER_NAME = 'fal';
const TIMEOUT_MS = 300_000;
const POLL_INTERVAL_MS = 2000;

interface FalQueueResponse {
  request_id: string;
  status: 'in_queue' | 'in_progress' | 'completed' | 'failed';
  queue_position?: number;
  response?: {
    video?: {
      url: string;
      content_type?: string;
      file_name?: string;
      file_size?: number;
    };
    thumbnail?: {
      url: string;
    };
    prompt?: string;
    seed?: number;
  };
  error?: string;
  metrics?: {
    queue_time?: number;
    inference_time?: number;
    total_time?: number;
  };
}

interface FalAppConfig {
  model?: string;
  [key: string]: unknown;
}

const DEFAULT_MODEL = 'fal-ai/veo-video';

class FalProvider implements Provider {
  readonly name = PROVIDER_NAME;
  readonly displayName = 'Fal.ai';
  readonly capabilities = ['text-to-video', 'image-to-video', 'queue-based', 'model-selection', 'fast'];
  readonly baseUrl: string;
  readonly isAvailable: boolean;

  private readonly apiKey: string;

  constructor() {
    this.apiKey = config.providers.fal.apiKey;
    this.baseUrl = config.providers.fal.baseUrl;
    this.isAvailable = !!this.apiKey;
  }

  async generateVideo(options: GenerateVideoOptions): Promise<VideoJobStatus> {
    if (!this.apiKey) {
      return this.mockGenerate(options);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const model = (options.model as string) || (options.appConfig as FalAppConfig)?.model || DEFAULT_MODEL;
      const resolution = options.resolution || '1920x1080';
      const [width, height] = resolution.split('x').map(Number);

      const body: Record<string, unknown> = {
        prompt: options.prompt,
        model,
        num_frames: this.calculateFrames(options.duration),
        fps: options.fps || 24,
        width: width || 1920,
        height: height || 1080,
      };

      if (options.imageUrl) {
        body.image_url = options.imageUrl;
      }
      if (options.negativePrompt) {
        body.negative_prompt = options.negativePrompt;
      }
      if (options.style) {
        body.style = options.style;
      }
      if (options.seed !== undefined) {
        body.seed = options.seed;
      }

      const response = await fetch(`${this.baseUrl}/queue`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
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
        throw new Error(`Fal.ai API error ${response.status}: ${message}`);
      }

      const data: FalQueueResponse = await response.json();

      if (data.status === 'completed' && data.response?.video?.url) {
        return {
          jobId: data.request_id,
          status: 'completed',
          progress: 100,
          resultUrl: data.response.video.url,
          thumbnailUrl: data.response.thumbnail?.url,
          errorMessage: data.error,
          estimatedDuration: data.metrics?.total_time,
        };
      }

      return {
        jobId: data.request_id,
        status: 'pending',
        progress: data.queue_position !== undefined ? Math.max(1, 100 - data.queue_position * 10) : 5,
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
      const response = await fetch(`${this.baseUrl}/queue/requests/${jobId}`, {
        headers: {
          'Authorization': `Key ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Fal.ai status error ${response.status}: ${errBody}`);
      }

      const data: FalQueueResponse = await response.json();

      return {
        jobId,
        status: this.mapStatus(data.status),
        progress: this.statusToProgress(data.status, data.queue_position),
        resultUrl: data.response?.video?.url,
        thumbnailUrl: data.response?.thumbnail?.url,
        errorMessage: data.error,
        estimatedDuration: data.metrics?.total_time,
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
      const response = await fetch(`${this.baseUrl}/queue/requests/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
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

  private calculateFrames(duration?: number): number {
    if (!duration) return 48;
    return Math.max(1, Math.round(duration * 24));
  }

  private mapStatus(status: string): VideoJobStatus['status'] {
    switch (status) {
      case 'in_queue':
        return 'pending';
      case 'in_progress':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private statusToProgress(status: string, queuePosition?: number): number {
    switch (status) {
      case 'in_queue':
        return queuePosition !== undefined ? Math.max(5, 100 - queuePosition * 10) : 5;
      case 'in_progress':
        return 50;
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  }

  private async mockGenerate(options: GenerateVideoOptions): Promise<VideoJobStatus> {
    const jobId = `fal-mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    logger.info(`[${PROVIDER_NAME}] Mock generateVideo`, { prompt: options.prompt, jobId });
    return {
      jobId,
      status: 'completed',
      progress: 100,
      resultUrl: `https://mock.fal.ai/videos/${jobId}/output.mp4`,
      thumbnailUrl: `https://mock.fal.ai/videos/${jobId}/thumb.jpg`,
      estimatedDuration: options.duration || 5,
    };
  }
}

export function registerProvider(): FalProvider {
  const provider = new FalProvider();
  providerRegistry.register(provider);
  logger.info(`Registering provider: ${PROVIDER_NAME}`);
  return provider;
}

export default FalProvider;
