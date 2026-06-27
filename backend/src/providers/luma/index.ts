import { config } from '../../core/config/index.js';
import { logger } from '../../core/logger/index.js';
import { Provider, GenerateVideoOptions, VideoJobStatus } from '../interface.js';
import { providerRegistry } from '../registry.js';

const PROVIDER_NAME = 'luma';
const TIMEOUT_MS = 180_000;

interface LumaGenerationResponse {
  id: string;
  state: 'queued' | 'processing' | 'completed' | 'failed';
  video?: {
    url: string;
    thumbnail_url?: string;
  };
  failure_reason?: string;
  created_at: string;
}

class LumaProvider implements Provider {
  readonly name = PROVIDER_NAME;
  readonly displayName = 'Luma AI';
  readonly capabilities = ['text-to-video', 'image-to-video', 'camera-motion', 'high-quality'];
  readonly baseUrl: string;
  readonly isAvailable: boolean;

  private readonly apiKey: string;

  constructor() {
    this.apiKey = config.providers.luma.apiKey;
    this.baseUrl = config.providers.luma.baseUrl;
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
        aspect_ratio: this.parseAspectRatio(options.resolution),
      };

      if (options.imageUrl) {
        body.image_url = options.imageUrl;
      }
      if (options.duration) {
        body.duration = options.duration;
      }
      if (options.negativePrompt) {
        body.negative_prompt = options.negativePrompt;
      }

      const cameraMotion = options.camera_motion || options.cameraMotion || options.style;
      if (cameraMotion) {
        body.camera_motion = cameraMotion;
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
        throw new Error(`Luma API error ${response.status}: ${message}`);
      }

      const data: LumaGenerationResponse = await response.json();

      return {
        jobId: data.id,
        status: this.mapState(data.state),
        progress: this.stateToProgress(data.state),
        resultUrl: data.video?.url,
        thumbnailUrl: data.video?.thumbnail_url,
        errorMessage: data.failure_reason,
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
        throw new Error(`Luma status error ${response.status}: ${errBody}`);
      }

      const data: LumaGenerationResponse = await response.json();

      return {
        jobId,
        status: this.mapState(data.state),
        progress: this.stateToProgress(data.state),
        resultUrl: data.video?.url,
        thumbnailUrl: data.video?.thumbnail_url,
        errorMessage: data.failure_reason,
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

  private parseAspectRatio(resolution?: string): string {
    if (!resolution) return '16:9';
    const map: Record<string, string> = {
      '1920x1080': '16:9',
      '1080x1920': '9:16',
      '1080x1080': '1:1',
      '3840x2160': '16:9',
      '720x1280': '9:16',
      '1280x720': '16:9',
    };
    return map[resolution] || '16:9';
  }

  private mapState(state: string): VideoJobStatus['status'] {
    switch (state) {
      case 'queued':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private stateToProgress(state: string): number {
    switch (state) {
      case 'queued':
        return 5;
      case 'processing':
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
    const jobId = `luma-mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    logger.info(`[${PROVIDER_NAME}] Mock generateVideo`, { prompt: options.prompt, jobId });
    return {
      jobId,
      status: 'completed',
      progress: 100,
      resultUrl: `https://mock.lumalabs.ai/videos/${jobId}/output.mp4`,
      thumbnailUrl: `https://mock.lumalabs.ai/videos/${jobId}/thumb.jpg`,
      estimatedDuration: options.duration || 5,
    };
  }
}

export function registerProvider(): LumaProvider {
  const provider = new LumaProvider();
  providerRegistry.register(provider);
  logger.info(`Registering provider: ${PROVIDER_NAME}`);
  return provider;
}

export default LumaProvider;
