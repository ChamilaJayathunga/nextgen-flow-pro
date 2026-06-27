export interface GenerateVideoOptions {
  prompt: string;
  imageUrl?: string;
  videoRefUrl?: string;
  duration?: number;
  resolution?: string;
  style?: string;
  negativePrompt?: string;
  [key: string]: unknown;
}

export interface VideoJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  resultUrl?: string;
  errorMessage?: string;
  thumbnailUrl?: string;
  estimatedDuration?: number;
  cost?: number;
}

export interface Provider {
  readonly name: string;
  readonly displayName: string;
  readonly capabilities: string[];
  readonly baseUrl: string;
  readonly isAvailable: boolean;

  generateVideo(options: GenerateVideoOptions): Promise<VideoJobStatus>;
  getStatus(jobId: string): Promise<VideoJobStatus>;
  cancelJob(jobId: string): Promise<boolean>;
}

export interface ProviderMetrics {
  successRate: number;
  avgLatency: number;
  totalJobs: number;
  lastUsedAt: Date;
  isAvailable: boolean;
}
