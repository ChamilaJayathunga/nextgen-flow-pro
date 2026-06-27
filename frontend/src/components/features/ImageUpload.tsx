'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image, Film, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onFileSelect: (file: File | null) => void;
  currentFile?: File | null;
  currentUrl?: string;
  accept?: Record<string, string[]>;
  maxSize?: number;
  label?: string;
  type?: 'image' | 'video';
}

export function ImageUpload({
  onFileSelect,
  currentFile,
  currentUrl,
  accept,
  maxSize = 10 * 1024 * 1024,
  label,
  type = 'image',
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > maxSize) {
        setError(`File too large. Max size: ${maxSize / 1024 / 1024}MB`);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      onFileSelect(file);
    },
    [maxSize, onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept || (type === 'image'
      ? { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }
      : { 'video/*': ['.mp4', '.mov', '.avi', '.webm'] }),
    maxFiles: 1,
    multiple: false,
  });

  const handleRemove = () => {
    if (preview && !currentUrl) URL.revokeObjectURL(preview);
    setPreview(null);
    onFileSelect(null);
    setError(null);
  };

  const Icon = type === 'image' ? Image : Film;

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-300">{label}</label>
      )}
      {preview ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group"
        >
          {type === 'image' ? (
            <img
              src={preview}
              alt="Upload preview"
              className="w-full h-40 object-cover rounded-xl"
            />
          ) : (
            <video
              src={preview}
              className="w-full h-40 object-cover rounded-xl"
              controls
            />
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
            <button
              onClick={handleRemove}
              className="p-2 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200',
            isDragActive
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-white/10 hover:border-purple-500/50 hover:bg-white/5'
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              'p-3 rounded-xl transition-colors',
              isDragActive ? 'bg-purple-500/20' : 'bg-white/5'
            )}>
              {isDragActive ? (
                <Upload className="w-6 h-6 text-purple-400" />
              ) : (
                <Icon className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <p className="text-sm text-gray-400">
              {isDragActive ? (
                'Drop file here'
              ) : (
                <>
                  <span className="text-purple-400">Click to upload</span> or drag and drop
                </>
              )}
            </p>
            <p className="text-xs text-gray-500">
              {type === 'image' ? 'PNG, JPG, GIF, WebP' : 'MP4, MOV, AVI, WebM'} up to {maxSize / 1024 / 1024}MB
            </p>
          </div>
        </div>
      )}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-xs text-red-400 flex items-center gap-1"
          >
            <FileWarning className="w-3 h-3" /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
