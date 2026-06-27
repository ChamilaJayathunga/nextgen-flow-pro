'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import {
  Search,
  Sparkles,
  Film,
  Clock,
  Monitor,
  ArrowRight,
} from 'lucide-react';

const categories = ['All', 'Cinematic', 'Explainer', 'Social Media', 'Product', 'Anime', 'Fantasy', 'Cyberpunk'];

const templates = [
  {
    id: 1,
    title: 'Cinematic Trailer',
    description: 'Epic cinematic trailer with dramatic transitions and effects',
    category: 'Cinematic',
    preview: '🎬',
    duration: 15,
    resolution: '4K',
    popular: true,
  },
  {
    id: 2,
    title: 'Product Launch',
    description: 'Professional product showcase with 3D rotation animation',
    category: 'Product',
    preview: '📦',
    duration: 30,
    resolution: '4K',
    popular: false,
  },
  {
    id: 3,
    title: 'Social Story',
    description: 'Vertical video optimized for Instagram and TikTok',
    category: 'Social Media',
    preview: '📱',
    duration: 10,
    resolution: '1080p',
    popular: false,
  },
  {
    id: 4,
    title: 'Anime Opening',
    description: 'Japanese anime-style opening sequence with dynamic effects',
    category: 'Anime',
    preview: '🌸',
    duration: 20,
    resolution: '1080p',
    popular: true,
  },
  {
    id: 5,
    title: 'Tech Explain',
    description: 'Clean animated explainer for tech products and services',
    category: 'Explainer',
    preview: '💻',
    duration: 25,
    resolution: '4K',
    popular: false,
  },
  {
    id: 6,
    title: 'Fantasy World',
    description: 'Magical fantasy world introduction with particle effects',
    category: 'Fantasy',
    preview: '🏰',
    duration: 20,
    resolution: '4K',
    popular: false,
  },
  {
    id: 7,
    title: 'Cyberpunk City',
    description: 'Neon-drenched cyberpunk cityscape with dynamic lighting',
    category: 'Cyberpunk',
    preview: '🌃',
    duration: 15,
    resolution: '4K',
    popular: true,
  },
  {
    id: 8,
    title: 'Nature Documentary',
    description: 'Stunning nature footage style with cinematic grading',
    category: 'Cinematic',
    preview: '🌿',
    duration: 30,
    resolution: '4K',
    popular: false,
  },
  {
    id: 9,
    title: 'Gaming Montage',
    description: 'High-energy gaming montage with fast-paced transitions',
    category: 'Cinematic',
    preview: '🎮',
    duration: 15,
    resolution: '1080p',
    popular: false,
  },
];

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Templates</h1>
            <p className="text-gray-400 text-sm mt-1">Start with a pre-made template and customize</p>
          </div>
          <div className="relative flex-1 max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 input-focus-ring"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap border transition-all',
                selectedCategory === cat
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                  : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              className="glass rounded-2xl overflow-hidden group cursor-pointer"
            >
              <div className="aspect-video bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-teal-500/10 flex items-center justify-center relative">
                <span className="text-6xl">{template.preview}</span>
                {template.popular && (
                  <div className="absolute top-3 left-3">
                    <Badge variant="primary">
                      <Sparkles className="w-3 h-3" /> Popular
                    </Badge>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Link href={`/create?template=${template.id}`}>
                    <Button variant="gradient" size="sm" icon={<Sparkles className="w-4 h-4" />}>
                      Use Template
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-white mb-1">{template.title}</h3>
                <p className="text-xs text-gray-400 mb-3">{template.description}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{template.duration}s</span>
                  <span className="flex items-center gap-1"><Monitor className="w-3 h-3" />{template.resolution}</span>
                  <Badge variant="default" className="ml-auto">{template.category}</Badge>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-16">
            <Film className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
            <p className="text-sm text-gray-400">Try a different search or category</p>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
