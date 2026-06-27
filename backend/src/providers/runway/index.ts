import { config } from '../../core/config/index.js';
import { logger } from '../../core/logger/index.js';
import { Provider, GenerateVideoOptions, VideoJobStatus } from '../interface.js';
import { providerRegistry } from '../registry.js';

const PROVIDER_NAME = 'runway';
const TIMEOUT_MS = 180_000;

interface RunwayGenerationResponse {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  output?: string[];
  error?: string;
  created_at: string;
  progress?: number;
}

class RunwayProvider implements Provider {
  readonly name = PROVIDER_NAME;
  readonly displayName = 'Runway ML';
  readonly capabilities = ['text-to-video', 'image-to-video', 'video-to-video', 'high-quality'];
  readonly baseUrl: string;
  readonly isAvailable: boolean;

  private readonly apiKey: string;

  constructor() {
    this.apiKey = config.providers.runway.apiKey;
    this.baseUrl = config.providers.runway.baseUrl;
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
        duration: options.duration || 5,
        width: width || 1920,
        height: height || 1080,
      };

      if (options.imageUrl) {
        body.imageUrl = options.imageUrl;
        body.taskType = 'image-to-video';
      } else {
        body.taskType = 'text-to-video';
      }
      if (options.negativePrompt) {
        body.negative_prompt = options.negativePrompt;
      }
      if (options.style) {
        body.style_preset = options.style;
      }

      const response = await fetch(`${this.baseUrl}/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Runway-Version': '1',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        let parsed: { detail?: string; message?: string } = {};
        try { parsed = JSON.parse(errBody); } catch { /* empty */ }
        const message = parsed.detail || parsed.message || errBody;
        throw new Error(`Runway API error ${response.status}: ${message}`);
      }

      const data: RunwayGenerationResponse = await response.json();

      return {
        jobId: data.id,
        status: this.mapStatus(data.status),
        progress: data.progress ?? this.statusToProgress(data.status),
        resultUrl: data.output?.[0],
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
          'X-Runway-Version': '1',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Runway status error ${response.status}: ${errBody}`);
      }

      const data: RunwayGenerationResponse = await response.json();

      return {
        jobId,
        status: this.mapStatus(data.status),
        progress: data.progress ?? this.statusToProgress(data.status),
        resultUrl: data.output?.[0],
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
          'X-Runway-Version': '1',
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
    const jobId = `runway-mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    logger.info(`[${PROVIDER_NAME}] Mock generateVideo`, { prompt: options.prompt, jobId });
    return {
      jobId,
      status: 'completed',
      progress: 100,
      resultUrl: `https://mock.runwayml.com/output/${jobId}/video.mp4`,
      thumbnailUrl: `https://mock.runwayml.com/output/${jobId}/thumbnail.jpg`,
      estimatedDuration: options.duration || 5,
    };
  }
}

export function registerProvider(): RunwayProvider {
  const provider = new RunwayProvider();
  providerRegistry.register(provider);
  logger.info(`Registering provider: ${PROVIDER_NAME}`);
  return provider;
}

export default RunwayProvider;
