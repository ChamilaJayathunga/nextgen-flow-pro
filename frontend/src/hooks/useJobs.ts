'use client';

import { useState, useCallback } from 'react';
import { get, post, del } from '@/lib/api';
import type { VideoJob } from '@/types';

interface UseJobsReturn {
  jobs: VideoJob[];
  job: VideoJob | null;
  isLoading: boolean;
  error: string | null;
  totalPages: number;
  currentPage: number;
  fetchJobs: (page?: number, filters?: Record<string, string>) => Promise<void>;
  fetchJob: (id: string) => Promise<void>;
  createJob: (data: Partial<VideoJob>) => Promise<VideoJob>;
  deleteJob: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  generateVideo: (data: Record<string, unknown>) => Promise<VideoJob>;
}

export function useJobs(): UseJobsReturn {
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [job, setJob] = useState<VideoJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchJobs = useCallback(
    async (page = 1, filters: Record<string, string> = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: page.toString(), ...filters });
        const response = await get<{ jobs: VideoJob[]; totalPages: number }>(
          `/jobs?${params}`
        );
        setJobs(response.jobs);
        setTotalPages(response.totalPages);
        setCurrentPage(page);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchJob = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await get<VideoJob>(`/jobs/${id}`);
      setJob(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createJob = useCallback(async (data: Partial<VideoJob>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await post<VideoJob>('/jobs', data);
      return response;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await del(`/jobs/${id}`);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    try {
      const response = await post<VideoJob>(`/jobs/${id}/favorite`);
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, isFavorite: response.isFavorite } : j))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle favorite');
    }
  }, []);

  const generateVideo = useCallback(async (data: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await post<VideoJob>('/jobs/generate', data);
      return response;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate video');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    jobs,
    job,
    isLoading,
    error,
    totalPages,
    currentPage,
    fetchJobs,
    fetchJob,
    createJob,
    deleteJob,
    toggleFavorite,
    generateVideo,
  };
}
