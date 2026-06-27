export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin';
  plan: 'free' | 'pro' | 'enterprise';
  credits: number;
  createdAt: string;
}

export interface VideoJob {
  id: string;
  userId: string;
  title: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  provider?: string;
  duration: number;
  resolution: string;
  style?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  negativePrompt?: string;
  imageUrl?: string;
  referenceUrl?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  isFavorite: boolean;
}

export interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  previewUrl: string;
  promptTemplate: string;
  duration: number;
  resolution: string;
  style: string;
  createdAt: string;
}

export interface Provider {
  id: string;
  name: string;
  logo: string;
  description: string;
  status: 'online' | 'offline' | 'degraded';
  avgResponseTime: number;
  costPerSecond: number;
  supportedFeatures: string[];
  isEnabled: boolean;
}

export interface Invoice {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  createdAt: string;
  paidAt?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

export interface Stats {
  totalVideos: number;
  totalUsers: number;
  totalProviders: number;
  videosGenerated: number;
  creditsUsed: number;
  storageUsed: number;
  activeJobs: number;
}

export interface Activity {
  id: string;
  type: 'video_created' | 'video_completed' | 'video_failed' | 'credits_used' | 'plan_upgraded';
  description: string;
  createdAt: string;
}
