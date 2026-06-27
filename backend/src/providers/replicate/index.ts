import { config } from '../../core/config/index.js';
import { logger } from '../../core/logger/index.js';
import { Provider, GenerateVideoOptions, VideoJobStatus } from '../interface.js';
import { providerRegistry } from '../registry.js';

const PROVIDER_NAME = 'replicate';
const TIMEOUT_MS = 300_000;

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[];
  error?: string;
  metrics?: {
    predict_time?: number;
  };
  urls?: {
    cancel: string;
    get: string;
  };
  created_at: string;
  completed_at?: string;
}

const DEFAULT_MODEL = 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438';

class ReplicateProvider implements Provider {
  readonly name = PROVIDER_NAME;
  readonly displayName = 'Replicate';
  readonly capabilities = ['text-to-video', 'image-to-video', 'model-selection', 'community-models'];
  readonly baseUrl: string;
  readonly isAvailable: boolean;

  private readonly apiKey: string;

  constructor() {
    this.apiKey = config.providers.replicate.apiKey;
    this.baseUrl = config.providers.replicate.baseUrl;
    this.isAvailable = !!this.apiKey;
  }

  async generateVideo(options: GenerateVideoOptions): Promise<VideoJobStatus> {
    if (!this.apiKey) {
      return this.mockGenerate(options);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const modelVersion = (options.model as string) || (options.modelVersion as string) || DEFAULT_MODEL;
      const resolution = options.resolution || '1920x1080';
      const [width, height] = resolution.split('x').map(Number);

      const input: Record<string, unknown> = {
        prompt: options.prompt,
        width: width || 1920,
        height: height || 1080,
      };

      if (options.imageUrl) {
        input.input_image = options.imageUrl;
      }
      if (options.negativePrompt) {
        input.negative_prompt = options.negativePrompt;
      }
      if (options.duration) {
        input.video_length = options.duration;
      }
      if (options.style) {
        input.style = options.style;
      }
      if (options.fps !== undefined) {
        input.fps = options.fps;
      }

      const body = {
        version: modelVersion,
        input,
      };

      const response = await fetch(`${this.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        let parsed: { detail?: string } = {};
        try { parsed = JSON.parse(errBody); } catch { /* empty */ }
        throw new Error(`Replicate API error ${response.status}: ${parsed.detail || errBody}`);
      }

      const prediction: ReplicatePrediction = await response.json();

      return {
        jobId: prediction.id,
        status: this.mapStatus(prediction.status),
        progress: this.statusToProgress(prediction.status),
        resultUrl: this.extractOutputUrl(prediction.output),
        errorMessage: prediction.error,
        estimatedDuration: prediction.metrics?.predict_time,
        cost: prediction.metrics?.predict_time ? prediction.metrics.predict_time * 0.0001 : undefined,
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
      const response = await fetch(`${this.baseUrl}/predictions/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Replicate status error ${response.status}: ${errBody}`);
      }

      const prediction: ReplicatePrediction = await response.json();

      return {
        jobId,
        status: this.mapStatus(prediction.status),
        progress: this.statusToProgress(prediction.status),
        resultUrl: this.extractOutputUrl(prediction.output),
        errorMessage: prediction.error,
        estimatedDuration: prediction.metrics?.predict_time,
        cost: prediction.metrics?.predict_time ? prediction.metrics.predict_time * 0.0001 : undefined,
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
      const response = await fetch(`${this.baseUrl}/predictions/${jobId}/cancel`, {
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

  private extractOutputUrl(output: string | string[] | undefined): string | undefined {
    if (!output) return undefined;
    if (typeof output === 'string') return output;
    if (Array.isArray(output) && output.length > 0) return output[0];
    return undefined;
  }

  private mapStatus(status: string): VideoJobStatus['status'] {
    switch (status) {
      case 'starting':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'succeeded':
        return 'completed';
      case 'failed':
      case 'canceled':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private statusToProgress(status: string): number {
    switch (status) {
      case 'starting':
        return 5;
      case 'processing':
        return 50;
      case 'succeeded':
        return 100;
      case 'failed':
      case 'canceled':
        return 0;
      default:
        return 0;
    }
  }

  private async mockGenerate(options: GenerateVideoOptions): Promise<VideoJobStatus> {
    const jobId = `replicate-mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    logger.info(`[${PROVIDER_NAME}] Mock generateVideo`, { prompt: options.prompt, jobId });
    return {
      jobId,
      status: 'completed',
      progress: 100,
      resultUrl: `https://mock.replicate.com/${jobId}/output.mp4`,
      thumbnailUrl: `https://mock.replicate.com/${jobId}/thumbnail.jpg`,
      estimatedDuration: options.duration || 5,
      cost: 0.005,
    };
  }
}

export function registerProvider(): ReplicateProvider {
  const provider = new ReplicateProvider();
  providerRegistry.register(provider);
  logger.info(`Registering provider: ${PROVIDER_NAME}`);
  return provider;
}

export default ReplicateProvider;
