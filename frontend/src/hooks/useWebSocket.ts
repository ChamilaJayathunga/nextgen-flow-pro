'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '@/lib/auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

interface UseWebSocketOptions {
  onJobUpdate?: (data: Record<string, unknown>) => void;
  onJobCompleted?: (data: Record<string, unknown>) => void;
  onJobFailed?: (data: Record<string, unknown>) => void;
  onProgress?: (data: Record<string, unknown>) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('job:update', (data: Record<string, unknown>) => {
      options.onJobUpdate?.(data);
    });

    socket.on('job:completed', (data: Record<string, unknown>) => {
      options.onJobCompleted?.(data);
    });

    socket.on('job:failed', (data: Record<string, unknown>) => {
      options.onJobFailed?.(data);
    });

    socket.on('job:progress', (data: Record<string, unknown>) => {
      options.onProgress?.(data);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [options.onJobUpdate, options.onJobCompleted, options.onJobFailed, options.onProgress]);

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { emit };
}
