import { PrismaClient } from '@prisma/client';
import { logger } from '../core/logger/index.js';
import { NotFoundError } from '../core/error-handler/index.js';

const prisma = new PrismaClient();

interface EnhancedPromptResult {
  original: string;
  enhanced: string;
  keywords: string[];
  style: string | null;
  mood: string | null;
}

interface StoryboardScene {
  sceneNumber: number;
  description: string;
  duration: number;
  visualNotes: string;
  cameraDirection: string;
}

interface StoryboardResult {
  title: string;
  prompt: string;
  scenes: StoryboardScene[];
  totalDuration: number;
}

export class PromptService {
  async enhancePrompt(prompt: string): Promise<EnhancedPromptResult> {
    const keywords = this.extractKeywords(prompt);
    const style = this.detectStyle(prompt);
    const mood = this.detectMood(prompt);

    const enhanced = this.buildEnhancedPrompt(prompt, keywords, style, mood);

    logger.info('Prompt enhanced', {
      originalLength: prompt.length,
      enhancedLength: enhanced.length,
      keywordCount: keywords.length,
    });

    return {
      original: prompt,
      enhanced,
      keywords,
      style,
      mood,
    };
  }

  private extractKeywords(prompt: string): string[] {
    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at',
      'to', 'for', 'of', 'with', 'by', 'from', 'and', 'or', 'but',
      'this', 'that', 'these', 'those', 'it', 'its', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'shall', 'can',
      'about', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'out', 'off', 'over', 'under',
      'again', 'further', 'then', 'once', 'here', 'there', 'very',
      'just', 'also', 'more', 'some', 'any', 'each', 'every', 'both',
      'few', 'most', 'other', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'all', 'well',
    ]);

    const words = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    const wordFreq = new Map<string, number>();
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
    }

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private detectStyle(prompt: string): string | null {
    const styles: Record<string, RegExp[]> = {
      cinematic: [/cinemat(i|c)/i, /film/i, /movie/i, /hollywood/i, /blockbuster/i],
      anime: [/anime/i, /manga/i, /japanese.*animation/i],
      '3d-render': [/3d/i, /render/i, /cgi/i, /computer.*generat/i],
      pixel: [/pixel/i, /8.?bit/i, /16.?bit/i, /retro/i],
      realistic: [/realist/i, /photo.*real/i, /photoreal/i, /hyper.?real/i],
      watercolor: [/watercolou?r/i, /aquarelle/i, /painting/i],
      sketch: [/sketch/i, /drawing/i, /pencil/i, /charcoal/i],
      cartoon: [/cartoon/i, /toon/i, /comic/i, /animation/i],
      'cyberpunk': [/cyberpunk/i, /neon/i, /futuristic/i, /dystopian/i],
      fantasy: [/fantasy/i, /magical/i, /mythical/i, /medieval/i, /dragon/i],
    };

    for (const [style, patterns] of Object.entries(styles)) {
      for (const pattern of patterns) {
        if (pattern.test(prompt)) {
          return style;
        }
      }
    }

    return null;
  }

  private detectMood(prompt: string): string | null {
    const moods: Record<string, RegExp[]> = {
      dramatic: [/dramatic/i, /intense/i, /epic/i, /powerful/i],
      peaceful: [/peaceful/i, /calm/i, /serene/i, /tranquil/i, /gentle/i],
      dark: [/dark/i, /gloomy/i, /ominous/i, /shadowy/i, /mysterious/i],
      happy: [/happy/i, /joyful/i, /cheerful/i, /bright/i, /colorful/i],
      sad: [/sad/i, /melanchol/i, /somber/i, /mournful/i, /tragic/i],
      energetic: [/energetic/i, /vibrant/i, /dynamic/i, /fast.?paced/i],
      dreamy: [/dream/i, /ethereal/i, /surreal/i, /whimsical/i, /fantastical/i],
      suspenseful: [/suspense/i, /thriller/i, /tense/i, /edge.*seat/i],
    };

    for (const [mood, patterns] of Object.entries(moods)) {
      for (const pattern of patterns) {
        if (pattern.test(prompt)) {
          return mood;
        }
      }
    }

    return null;
  }

  private buildEnhancedPrompt(
    prompt: string,
    keywords: string[],
    style: string | null,
    mood: string | null,
  ): string {
    const parts: string[] = [prompt.trim()];

    if (!prompt.endsWith('.') && !prompt.endsWith('!') && !prompt.endsWith('?')) {
      parts[0] += '.';
    }

    const enhancements: string[] = [];

    if (style) {
      const styleDescriptions: Record<string, string> = {
        cinematic: 'Cinematic composition with dramatic lighting and shallow depth of field.',
        anime: 'Anime-style animation with vibrant colors and expressive character designs.',
        '3d-render': 'High-quality 3D render with realistic textures and global illumination.',
        pixel: 'Pixel art style with distinct pixelated aesthetics and retro game feel.',
        realistic: 'Photorealistic quality with lifelike details and natural lighting.',
        watercolor: 'Watercolor painting style with soft edges and fluid color blending.',
        sketch: 'Hand-drawn sketch style with visible pencil strokes and artistic shading.',
        cartoon: 'Cartoon style with bold outlines, vibrant colors, and stylized proportions.',
        cyberpunk: 'Cyberpunk aesthetic with neon lights, dark urban environment, and tech elements.',
        fantasy: 'Fantasy realm with magical elements, otherworldly landscapes, and mythical creatures.',
      };
      if (styleDescriptions[style]) {
        enhancements.push(styleDescriptions[style]);
      }
    }

    if (mood) {
      const moodDescriptions: Record<string, string> = {
        dramatic: 'Dramatic atmosphere with high contrast and emotional intensity.',
        peaceful: 'Peaceful and serene atmosphere with soft transitions and gentle movements.',
        dark: 'Dark and moody atmosphere with deep shadows and muted colors.',
        happy: 'Bright and cheerful atmosphere with warm colors and lively energy.',
        sad: 'Melancholic atmosphere with muted tones and somber pacing.',
        energetic: 'High-energy dynamic movement with rapid cuts and vibrant visuals.',
        dreamy: 'Dreamlike ethereal quality with soft focus and surreal elements.',
        suspenseful: 'Tension-filled atmosphere with careful pacing and dramatic reveals.',
      };
      if (moodDescriptions[mood]) {
        enhancements.push(moodDescriptions[mood]);
      }
    }

    if (keywords.length > 0) {
      const topKeywords = keywords.slice(0, 5).join(', ');
      enhancements.push(`Key elements: ${topKeywords}.`);
    }

    parts.push(' ' + enhancements.join(' '));

    return parts.join('').replace(/\s+/g, ' ').trim();
  }

  async generateStoryboard(prompt: string): Promise<StoryboardResult> {
    const words = prompt.split(/\s+/);
    const sceneCount = Math.min(Math.max(Math.ceil(words.length / 15), 3), 10);

    const scenes: StoryboardScene[] = [];
    for (let i = 0; i < sceneCount; i++) {
      const startIdx = Math.floor((i / sceneCount) * words.length);
      const endIdx = Math.floor(((i + 1) / sceneCount) * words.length);
      const sceneWords = words.slice(startIdx, endIdx);
      const scenePrompt = sceneWords.join(' ');

      scenes.push({
        sceneNumber: i + 1,
        description: scenePrompt || `Continuation of scene ${i + 1}`,
        duration: Math.max(2, Math.floor(Math.random() * 8) + 3),
        visualNotes: this.generateVisualNotes(scenePrompt, i, sceneCount),
        cameraDirection: this.getCameraDirection(i, sceneCount),
      });
    }

    const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
    const title = this.generateTitle(prompt);

    return {
      title,
      prompt,
      scenes,
      totalDuration,
    };
  }

  private generateTitle(prompt: string): string {
    const words = prompt.split(/\s+/);
    const maxTitleWords = Math.min(words.length, 6);
    const titleWords = words.slice(0, maxTitleWords);
    return titleWords
      .join(' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  private generateVisualNotes(scenePrompt: string, index: number, total: number): string {
    const notes: string[] = [];

    const lightings = [
      'Natural daylight', 'Golden hour lighting', 'Dramatic chiaroscuro',
      'Soft diffused light', 'Neon ambient lighting', 'Moonlit darkness',
      'Studio softbox lighting', 'Candlelit warm glow', 'Overcast natural light',
      'Backlit silhouette effect',
    ];
    notes.push(`Lighting: ${lightings[index % lightings.length]}`);

    const colors = [
      'Warm earth tones', 'Cool blue palette', 'Vibrant neon spectrum',
      'Monochrome grayscale', 'Pastel soft colors', 'High contrast bold colors',
      'Sepia vintage tones', 'Cyberpunk teal and pink', 'Forest natural greens',
      'Desert warm oranges',
    ];
    notes.push(`Color palette: ${colors[index % colors.length]}`);

    if (scenePrompt.length > 10) {
      notes.push(`Focus on: ${scenePrompt.substring(0, 50)}`);
    }

    return notes.join('. ');
  }

  private getCameraDirection(index: number, total: number): string {
    const directions = [
      'Wide establishing shot',
      'Medium shot',
      'Close-up detail',
      'Tracking shot following action',
      'Overhead aerial view',
      'Low angle dramatic shot',
      'Over-the-shoulder perspective',
      'Dutch angle tilted composition',
      'Steadicam smooth movement',
      'Crane shot descending',
      'POV first-person perspective',
      'Rack focus transition',
      'Panoramic sweeping view',
      'Zoom-in dramatic reveal',
      'Fish-eye wide angle',
    ];

    const idx = Math.floor((index / total) * directions.length);
    return directions[Math.min(idx, directions.length - 1)];
  }

  async getTemplates(options: {
    category?: string;
    userId?: string;
    isPublic?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    data: {
      id: string;
      title: string;
      content: string;
      category: string | null;
      isPublic: boolean;
      createdAt: Date;
    }[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (options.isPublic !== undefined) {
      where.isPublic = options.isPublic;
    }

    if (options.category) {
      where.category = options.category;
    }

    if (options.userId) {
      where.userId = options.userId;
    }

    const [data, total] = await Promise.all([
      prisma.promptTemplate.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          category: true,
          isPublic: true,
          createdAt: true,
        },
      }),
      prisma.promptTemplate.count({ where: where as any }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async saveTemplate(input: {
    title: string;
    content: string;
    category?: string;
    userId?: string;
    isPublic?: boolean;
  }): Promise<{
    id: string;
    title: string;
    content: string;
    category: string | null;
    isPublic: boolean;
    createdAt: Date;
  }> {
    const template = await prisma.promptTemplate.create({
      data: {
        title: input.title,
        content: input.content,
        category: input.category ?? null,
        userId: input.userId ?? null,
        isPublic: input.isPublic ?? true,
      },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        isPublic: true,
        createdAt: true,
      },
    });

    logger.info('Prompt template saved', { templateId: template.id, title: input.title });
    return template;
  }

  async deleteTemplate(templateId: string, userId?: string): Promise<void> {
    const template = await prisma.promptTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundError(`Prompt template ${templateId} not found`);
    }

    if (userId && template.userId !== userId) {
      throw new NotFoundError(`Prompt template ${templateId} not found`);
    }

    await prisma.promptTemplate.delete({ where: { id: templateId } });
    logger.info('Prompt template deleted', { templateId });
  }
}

export const promptService = new PromptService();
