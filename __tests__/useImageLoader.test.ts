import { renderHook, act, waitFor } from '@testing-library/react-native';
import useImageLoader from '../hooks/useImageLoader';

jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file://cache/',
  documentDirectory: 'file://documents/',
  downloadAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

describe('useImageLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadImage', () => {
    test('should load image successfully', async () => {
      const FileSystem = require('expo-file-system');
      FileSystem.downloadAsync.mockResolvedValue({
        uri: 'file://cache/image_1.jpg',
      });

      const { result } = renderHook(() => useImageLoader());

      act(() => {
        result.current.loadImage('https://example.com/image.jpg');
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
        expect(result.current.imageData).toBe('file://cache/image_1.jpg');
      });
    });

    test('should handle empty URL', async () => {
      const { result } = renderHook(() => useImageLoader());

      const resultValue = await act(async () => {
        return await result.current.loadImage('');
      });

      expect(resultValue).toBeNull();
    });

    test('should handle fetch errors', async () => {
      const FileSystem = require('expo-file-system');
      FileSystem.downloadAsync.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useImageLoader());

      act(() => {
        result.current.loadImage('https://example.com/image.jpg');
      });

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('Network error');
        expect(result.current.isLoaded).toBe(false);
      });
    });

    test('should add cache-busting parameters to URL', async () => {
      const FileSystem = require('expo-file-system');
      FileSystem.downloadAsync.mockResolvedValue({
        uri: 'file://cache/image_1.jpg',
      });

      const { result } = renderHook(() => useImageLoader());

      act(() => {
        result.current.loadImage('https://example.com/image.jpg');
      });

      await waitFor(() => {
        expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
          expect.stringMatching(/[?&]_=\d+_\d+/),
          expect.stringContaining('file://cache/')
        );
      });
    });

    test('should discard stale loads', async () => {
      const FileSystem = require('expo-file-system');
      FileSystem.downloadAsync
        .mockResolvedValueOnce({ uri: 'file://cache/image_1.jpg' })
        .mockResolvedValueOnce({ uri: 'file://cache/image_2.jpg' })
        .mockResolvedValueOnce({ uri: 'file://cache/image_3.jpg' });

      const { result } = renderHook(() => useImageLoader());

      act(() => {
        result.current.loadImage('https://example.com/image1.jpg');
        result.current.loadImage('https://example.com/image2.jpg');
        result.current.loadImage('https://example.com/image3.jpg');
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
        expect(result.current.imageData).toBe('file://cache/image_3.jpg');
        expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file://cache/image_1.jpg', { idempotent: true });
        expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file://cache/image_2.jpg', { idempotent: true });
      });
    });
  });

  describe('clearCache', () => {
    test('should clear image data', async () => {
      const FileSystem = require('expo-file-system');
      FileSystem.downloadAsync.mockResolvedValue({
        uri: 'file://cache/image_1.jpg',
      });

      const { result } = renderHook(() => useImageLoader());

      act(() => {
        result.current.loadImage('https://example.com/image.jpg');
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      act(() => {
        result.current.clearCache();
      });

      expect(result.current.imageData).toBeNull();
      expect(result.current.isLoaded).toBe(false);
      expect(result.current.error).toBeNull();
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file://cache/image_1.jpg', { idempotent: true });
    });
  });

  describe('Cleanup', () => {
    test('should cleanup on unmount', async () => {
      const FileSystem = require('expo-file-system');
      FileSystem.downloadAsync.mockResolvedValue({
        uri: 'file://cache/image_1.jpg',
      });

      const { result, unmount } = renderHook(() => useImageLoader());

      act(() => {
        result.current.loadImage('https://example.com/image.jpg');
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      unmount();

      expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file://cache/image_1.jpg', { idempotent: true });
    });
  });
});

console.log('✅ useImageLoader Tests Completed');
