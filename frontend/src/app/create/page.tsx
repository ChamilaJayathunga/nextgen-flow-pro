'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent } from '@/components/ui/Tabs';
import { PromptInput } from '@/components/features/PromptInput';
import { ImageUpload } from '@/components/features/ImageUpload';
import { ProviderSelector } from '@/components/features/ProviderSelector';
import { VideoPreview } from '@/components/features/VideoPreview';
import { OptionsPanel } from '@/components/features/OptionsPanel';
import { Sparkles, Wand2, Layout, ChevronDown, ChevronUp, Zap, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

const templates = [
  { id: 'blank', label: 'Blank Canvas', icon: '🎨' },
  { id: 'cinematic', label: 'Cinematic', icon: '🎬' },
  { id: 'explainer', label: 'Explainer', icon: '📊' },
  { id: 'product', label: 'Product Showcase', icon: '📦' },
  { id: 'social', label: 'Social Media', icon: '📱' },
  { id: 'anime', label: 'Anime Style', icon: '🌸' },
];

export default function CreatePage() {
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [duration, setDuration] = useState([10]);
  const [resolution, setResolution] = useState('1080p');
  const [style, setStyle] = useState('cinematic');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [cameraMotion, setCameraMotion] = useState('none');
  const [selectedProvider, setSelectedProvider] = useState('best');
  const [autoSelect, setAutoSelect] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 3000));
    setIsGenerating(false);
  };

  const estimatedCost = (duration[0] / 5) * 0.25;
  const estimatedTime = duration[0] * 12;

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Create Video</h1>
          <p className="text-gray-400 text-sm mt-1">Generate stunning AI videos from your prompts</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Quick Templates</label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap border transition-all',
                  selectedTemplate === t.id
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20'
                )}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <PromptInput
                value={prompt}
                onChange={setPrompt}
                onEnhance={() => {}}
                isEnhancing={false}
                error={!prompt.trim() && isGenerating ? 'Please enter a prompt' : undefined}
              />
            </Card>

            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <ImageUpload
                  onFileSelect={setImageFile}
                  currentFile={imageFile}
                  label="Image Reference (optional)"
                  type="image"
                />
              </Card>
              <Card>
                <ImageUpload
                  onFileSelect={setReferenceFile}
                  currentFile={referenceFile}
                  label="Video Reference (optional)"
                  type="video"
                />
              </Card>
            </div>

            <Card>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-purple-400" />
                  Advanced Options
                </h3>
                {showAdvanced ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              <motion.div
                initial={false}
                animate={{ height: showAdvanced ? 'auto' : 0, opacity: showAdvanced ? 1 : 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4">
                  <OptionsPanel
                    duration={duration}
                    onDurationChange={setDuration}
                    resolution={resolution}
                    onResolutionChange={setResolution}
                    style={style}
                    onStyleChange={setStyle}
                    negativePrompt={negativePrompt}
                    onNegativePromptChange={setNegativePrompt}
                    cameraMotion={cameraMotion}
                    onCameraMotionChange={setCameraMotion}
                  />
                </div>
              </motion.div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="sticky top-24">
              <VideoPreview
                isLoading={isGenerating}
                videoUrl={undefined}
              />
            </Card>

            <Card>
              <ProviderSelector
                selectedProvider={selectedProvider}
                onProviderChange={setSelectedProvider}
                autoSelect={autoSelect}
                onAutoSelectChange={setAutoSelect}
              />
            </Card>

            <Card>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-300">Generation Summary</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Duration</span>
                    <span className="text-white">{duration[0]} seconds</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Resolution</span>
                    <span className="text-white">{resolution}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Est. Cost</span>
                    <span className="text-white">${estimatedCost.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Est. Time</span>
                    <span className="text-white">{estimatedTime}s</span>
                  </div>
                </div>
              </div>
            </Card>

            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              isLoading={isGenerating}
              onClick={handleGenerate}
              disabled={!prompt.trim()}
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Generating...' : 'Generate Video'}
            </Button>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
