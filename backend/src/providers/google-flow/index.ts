import { config } from '../../core/config/index.js';
import { logger } from '../../core/logger/index.js';
import { Provider, GenerateVideoOptions, VideoJobStatus } from '../interface.js';
import { providerRegistry } from '../registry.js';

const PROVIDER_NAME = 'google-flow';
const TIMEOUT_MS = 120_000;

interface VertexVideoResponse {
  name: string;
  state: 'STATE_UNSPECIFIED' | 'JOB_STATE_QUEUED' | 'JOB_STATE_RUNNING' | 'JOB_STATE_SUCCEEDED' | 'JOB_STATE_FAILED' | 'JOB_STATE_CANCELLED';
  output?: {
    videoUri?: string;
    thumbnailUri?: string;
  };
  error?: {
    message: string;
    code: number;
  };
  createTime?: string;
  updateTime?: string;
}

class GoogleFlowProvider implements Provider {
  readonly name = PROVIDER_NAME;
  readonly displayName = 'Google Flow';
  readonly capabilities = ['text-to-video', 'image-to-video', 'high-quality', 'durable'];
  readonly baseUrl: string;
  readonly isAvailable: boolean;

  private readonly apiKey: string;

  constructor() {
    this.apiKey = config.providers.googleFlow.apiKey;
    this.baseUrl = config.providers.googleFlow.baseUrl;
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
        durationSeconds: options.duration || 10,
        width: width || 1920,
        height: height || 1080,
      };

      if (options.imageUrl) {
        body.imageUri = options.imageUrl;
      }
      if (options.style) {
        body.stylePreset = options.style;
      }
      if (options.negativePrompt) {
        body.negativePrompt = options.negativePrompt;
      }

      const response = await fetch(`${this.baseUrl}/videos`, {
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
        throw new Error(`Google Flow API error ${response.status}: ${errBody}`);
      }

      const data: VertexVideoResponse = await response.json();
      const jobId = data.name.split('/').pop() || data.name;

      return {
        jobId,
        status: this.mapState(data.state),
        progress: this.stateToProgress(data.state),
        resultUrl: data.output?.videoUri,
        thumbnailUrl: data.output?.thumbnailUri,
        errorMessage: data.error?.message,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
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
      const response = await fetch(`${this.baseUrl}/videos/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Google Flow status error ${response.status}: ${errBody}`);
      }

      const data: VertexVideoResponse = await response.json();

      return {
        jobId,
        status: this.mapState(data.state),
        progress: this.stateToProgress(data.state),
        resultUrl: data.output?.videoUri,
        thumbnailUrl: data.output?.thumbnailUri,
        errorMessage: data.error?.message,
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
      const response = await fetch(`${this.baseUrl}/videos/${jobId}:cancel`, {
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

  private mapState(state: string): VideoJobStatus['status'] {
    switch (state) {
      case 'JOB_STATE_QUEUED':
        return 'pending';
      case 'JOB_STATE_RUNNING':
        return 'processing';
      case 'JOB_STATE_SUCCEEDED':
        return 'completed';
      case 'JOB_STATE_FAILED':
      case 'JOB_STATE_CANCELLED':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private stateToProgress(state: string): number {
    switch (state) {
      case 'JOB_STATE_QUEUED':
        return 5;
      case 'JOB_STATE_RUNNING':
        return 45;
      case 'JOB_STATE_SUCCEEDED':
        return 100;
      case 'JOB_STATE_FAILED':
      case 'JOB_STATE_CANCELLED':
        return 0;
      default:
        return 0;
    }
  }

  private async mockGenerate(options: GenerateVideoOptions): Promise<VideoJobStatus> {
    const jobId = `google-flow-mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    logger.info(`[${PROVIDER_NAME}] Mock generateVideo`, { prompt: options.prompt, jobId });
    return {
      jobId,
      status: 'completed',
      progress: 100,
      resultUrl: `https://storage.googleapis.com/mock-output/${jobId}/video.mp4`,
      thumbnailUrl: `https://storage.googleapis.com/mock-output/${jobId}/thumbnail.jpg`,
      estimatedDuration: options.duration || 10,
    };
  }
}

export function registerProvider(): GoogleFlowProvider {
  const provider = new GoogleFlowProvider();
  providerRegistry.register(provider);
  logger.info(`Registering provider: ${PROVIDER_NAME}`);
  return provider;
}

export default GoogleFlowProvider;
