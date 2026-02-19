import { useState, useRef, useCallback, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { logger } from '@/utils/logger';

interface UseImageLoaderResult {
  imageData: string | null;
  isLoaded: boolean;
  error: Error | null;
  loadImage: (url: string) => Promise<string | null>;
  clearCache: () => void;
}

const useImageLoader = (): UseImageLoaderResult => {
  const [imageData, setImageData] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const loadAttemptIdRef = useRef<number>(0);
  const downloadedFilesRef = useRef<string[]>([]);

  const loadImage = useCallback(async (url: string): Promise<string | null> => {
    if (!url) {
      logger.warn('loadImage called with empty URL');
      return null;
    }

    const attemptId = ++loadAttemptIdRef.current;
    logger.debug('Starting image load', { url, attemptId });

    setError(null);
    setIsLoaded(false);

    try {
      const cacheBustUrl = `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}_${attemptId}`;

      const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!directory) {
        throw new Error('No cache directory available');
      }

      let extension = 'jpg';
      try {
        const parsedUrl = new URL(url);
        const match = parsedUrl.pathname.match(/\.([a-z0-9]+)$/i);
        if (match?.[1]) {
          extension = match[1].toLowerCase();
        }
      } catch {
      }

      const fileUri = `${directory}image_${Date.now()}_${attemptId}.${extension}`;
      const downloadResult = await FileSystem.downloadAsync(cacheBustUrl, fileUri);

      if (attemptId !== loadAttemptIdRef.current) {
        await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
        return null;
      }

      downloadedFilesRef.current.push(downloadResult.uri);
      setImageData(downloadResult.uri);
      setIsLoaded(true);
      return downloadResult.uri;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      logger.error('Image load failed', error, { url, attemptId });
      setError(error);
      setIsLoaded(false);
      return null;
    }
  }, []);

  const clearCache = useCallback(() => {
    downloadedFilesRef.current.forEach(fileUri => {
      FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {
      });
    });
    downloadedFilesRef.current = [];
    setImageData(null);
    setIsLoaded(false);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      clearCache();
    };
  }, [clearCache]);

  return {
    imageData,
    isLoaded,
    error,
    loadImage,
    clearCache,
  };
};

export default useImageLoader;
