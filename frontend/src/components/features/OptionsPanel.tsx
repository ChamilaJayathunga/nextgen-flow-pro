'use client';

import * as Slider from '@radix-ui/react-slider';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Clock, Monitor, Palette, Camera, Ban } from 'lucide-react';

interface OptionsPanelProps {
  duration: number[];
  onDurationChange: (value: number[]) => void;
  resolution: string;
  onResolutionChange: (value: string) => void;
  style: string;
  onStyleChange: (value: string) => void;
  negativePrompt: string;
  onNegativePromptChange: (value: string) => void;
  cameraMotion: string;
  onCameraMotionChange: (value: string) => void;
}

const resolutions = [
  { value: '720p', label: '720p (HD)' },
  { value: '1080p', label: '1080p (Full HD)' },
  { value: '2k', label: '2K (QHD)' },
  { value: '4k', label: '4K (Ultra HD)' },
];

const styles = [
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'anime', label: 'Anime' },
  { value: 'realistic', label: 'Realistic' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'cyberpunk', label: 'Cyberpunk' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'pixel-art', label: 'Pixel Art' },
  { value: '3d-render', label: '3D Render' },
];

const cameraMotions = [
  { value: 'none', label: 'No Motion' },
  { value: 'pan-left', label: 'Pan Left' },
  { value: 'pan-right', label: 'Pan Right' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'zoom-out', label: 'Zoom Out' },
  { value: 'dolly', label: 'Dolly' },
  { value: 'truck', label: 'Truck' },
  { value: 'pedestal', label: 'Pedestal' },
];

export function OptionsPanel({
  duration,
  onDurationChange,
  resolution,
  onResolutionChange,
  style,
  onStyleChange,
  negativePrompt,
  onNegativePromptChange,
  cameraMotion,
  onCameraMotionChange,
}: OptionsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          Duration: {duration[0]}s
        </label>
        <Slider.Root
          value={duration}
          onValueChange={onDurationChange}
          max={30}
          min={5}
          step={5}
          className="relative flex items-center w-full h-5"
        >
          <Slider.Track className="relative h-1.5 w-full rounded-full bg-white/10">
            <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500" />
          </Slider.Track>
          <Slider.Thumb className="block w-5 h-5 rounded-full bg-white border-2 border-purple-500 shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        </Slider.Root>
        <div className="flex justify-between text-xs text-gray-500">
          <span>5s</span>
          <span>30s</span>
        </div>
      </div>

      <Select
        label={
          <span className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-purple-400" />
            Resolution
          </span>
        }
        placeholder="Select resolution"
        options={resolutions}
        value={resolution}
        onValueChange={onResolutionChange}
      />

      <Select
        label={
          <span className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-400" />
            Style
          </span>
        }
        placeholder="Select style"
        options={styles}
        value={style}
        onValueChange={onStyleChange}
      />

      <Select
        label={
          <span className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-purple-400" />
            Camera Motion
          </span>
        }
        placeholder="Select camera motion"
        options={cameraMotions}
        value={cameraMotion}
        onValueChange={onCameraMotionChange}
      />

      <Input
        label={
          <span className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-purple-400" />
            Negative Prompt
          </span>
        }
        placeholder="What to avoid in the video..."
        value={negativePrompt}
        onChange={(e) => onNegativePromptChange(e.target.value)}
      />
    </motion.div>
  );
}
