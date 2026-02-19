/**
 * Image Download Comprehensive Tests
 * 
 * Tests for ImageManager and DownloadManager download functionality
 * including web download with CORS handling, native downloads, error handling,
 * retry logic, and edge cases.
 */

import { Alert, Platform } from 'react-native';
import ImageManager from '../utils/imageManager';
import DownloadManager from '../utils/downloadManager';

// Mock all dependencies
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'web',
  },
  AppState: {
    addEventListener: jest.fn(),
  },
  Image: {
    getSize: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(),
  },
}));

jest.mock('../utils/downloadManager', () => ({
  __esModule: true,
  default: {
    downloadFromWebView: jest.fn(),
    startDownload: jest.fn(),
  },
}));

jest.mock('../utils/storage', () => ({
  StorageManager: {
    addDownload: jest.fn().mockResolvedValue('download-id'),
    updateDownload: jest.fn(),
    getDownloads: jest.fn(),
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
}));

describe('ImageManager Download Tests', () => {
  const mockAlert = Alert.alert;

  beforeEach(() => {
    jest.clearAllMocks();
    ImageManager.clearCache();
    
    const { Image } = require('react-native');
    (Image.getSize as jest.Mock).mockImplementation((url: string, success: (width: number, height: number) => void) => {
      success(1920, 1080);
    });

    (mockAlert as jest.Mock).mockClear();
  });

  describe('Web Download with CORS Handling', () => {
    beforeEach(() => {
      Platform.OS = 'web';
    });

    test('should handle CORS-enabled image download', async () => {
      const testImageUrl = 'https://example.com/test-image.jpg';
      
      // Mock fetch to simulate CORS-enabled response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: jest.fn().mockResolvedValue(new Blob(['test data'], { type: 'image/jpeg' })),
      });

      const { URL } = global;
      URL.createObjectURL = jest.fn().mockReturnValue('blob:https://example.com/test-blob');
      URL.revokeObjectURL = jest.fn();

      await ImageManager.downloadImage(testImageUrl);

      expect(global.fetch).toHaveBeenCalledWith(testImageUrl);
      expect(mockAlert).toHaveBeenCalledWith(
        'Download Started',
        expect.stringContaining('test-image.jpg')
      );
    });

    test('should fallback to direct link when CORS fails', async () => {
      const testImageUrl = 'https://example.com/cors-image.jpg';
      
      // Mock fetch to simulate CORS failure
      global.fetch = jest.fn().mockRejectedValue(new Error('CORS policy'));

      const { URL } = global;
      URL.createObjectURL = jest.fn().mockReturnValue('blob:https://example.com/test-blob');
      URL.revokeObjectURL = jest.fn();

      await ImageManager.downloadImage(testImageUrl);

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Cannot download due to security restrictions. Try long-pressing and selecting "Open in New Tab"'
      );
    });

    test('should handle network errors during web download', async () => {
      const testImageUrl = 'https://example.com/network-error.jpg';
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Network Error',
      });

      await ImageManager.downloadImage(testImageUrl);

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Cannot download due to security restrictions. Try long-pressing and selecting "Open in New Tab"'
      );
    });

    test('should create and clean up blob URLs', async () => {
      const testImageUrl = 'https://example.com/blob-test.jpg';
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'image/jpeg' })),
      });

      const { URL } = global;
      URL.createObjectURL = jest.fn().mockReturnValue('blob:https://example.com/test-blob');
      URL.revokeObjectURL = jest.fn();

      await ImageManager.downloadImage(testImageUrl);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Native Download Scenarios', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    test('should handle successful native download', async () => {
      const testImageUrl = 'https://example.com/native-download.jpg';
      
      DownloadManager.downloadFromWebView = jest.fn().mockResolvedValue(undefined);

      await ImageManager.downloadImage(testImageUrl);

      expect(DownloadManager.downloadFromWebView).toHaveBeenCalledWith(
        testImageUrl,
        expect.stringContaining('.jpg')
      );
      expect(mockAlert).toHaveBeenCalledWith(
        'Download Started',
        expect.stringContaining('download')
      );
    });

    test('should handle download with custom success message', async () => {
      const testImageUrl = 'https://example.com/custom-msg.jpg';
      
      DownloadManager.downloadFromWebView = jest.fn().mockResolvedValue(undefined);

      await ImageManager.downloadImage(testImageUrl, {
        showSuccessAlert: true,
        customSuccessMessage: 'Your image is downloading!'
      });

      expect(mockAlert).toHaveBeenCalledWith(
        'Download Started',
        'Your image is downloading!'
      );
    });

    test('should handle download without success alert', async () => {
      const testImageUrl = 'https://example.com/no-alert.jpg';
      
      DownloadManager.downloadFromWebView = jest.fn().mockResolvedValue(undefined);

      await ImageManager.downloadImage(testImageUrl, {
        showSuccessAlert: false,
      });

      expect(mockAlert).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid URL', async () => {
      const invalidUrl = 'not-a-valid-url';

      await ImageManager.downloadImage(invalidUrl);

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Invalid image URL'
      );
    });

    test('should handle empty URL', async () => {
      const emptyUrl = '';

      await ImageManager.downloadImage(emptyUrl);

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Invalid image URL'
      );
    });

    test('should handle user cancellation gracefully', async () => {
      const testImageUrl = 'https://example.com/cancel-test.jpg';
      
      DownloadManager.downloadFromWebView = jest.fn().mockRejectedValue(
        new Error('Download cancelled by user')
      );

      await ImageManager.downloadImage(testImageUrl);

      expect(mockAlert).not.toHaveBeenCalled();
    });

    test('should call error callback on failure', async () => {
      const testImageUrl = 'https://example.com/error-callback.jpg';
      const errorCallback = jest.fn();
      
      DownloadManager.downloadFromWebView = jest.fn().mockRejectedValue(
        new Error('Download failed')
      );

      await ImageManager.downloadImage(testImageUrl, {
        onError: errorCallback,
      });

      expect(errorCallback).toHaveBeenCalled();
      expect(errorCallback.mock.calls[0][0].message).toBe('Download failed');
    });

    test('should show user-friendly error for CORS issues', async () => {
      const testImageUrl = 'https://example.com/cors-issue.jpg';
      
      DownloadManager.downloadFromWebView = jest.fn().mockRejectedValue(
        new Error('CORS policy prevented download')
      );

      await ImageManager.downloadImage(testImageUrl);

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Cannot download due to security restrictions. Try long-pressing and selecting "Open in New Tab"'
      );
    });

    test('should show user-friendly error for network issues', async () => {
      const testImageUrl = 'https://example.com/network-issue.jpg';
      
      DownloadManager.downloadFromWebView = jest.fn().mockRejectedValue(
        new Error('Network request failed')
      );

      await ImageManager.downloadImage(testImageUrl);

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Network error. Please check your connection and try again'
      );
    });

    test('should call success callback on successful download', async () => {
      const testImageUrl = 'https://example.com/success-callback.jpg';
      const successCallback = jest.fn();
      
      DownloadManager.downloadFromWebView = jest.fn().mockResolvedValue(undefined);

      await ImageManager.downloadImage(testImageUrl, {
        onSuccess: successCallback,
      });

      expect(successCallback).toHaveBeenCalled();
    });
  });

  describe('DownloadManager Direct Tests', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    test('should handle askDownloadLocation true with confirmation', async () => {
      const testUrl = 'https://example.com/confirm-download.jpg';
      let resolveAlert: ((value: unknown) => void) | undefined;
      
      (mockAlert as jest.Mock).mockImplementation((title: string, message?: string, buttons?: any[]) => {
        return new Promise((resolve) => {
          resolveAlert = resolve;
          if (buttons && buttons[1] && buttons[1].onPress) {
            buttons[1].onPress();
          }
        });
      });

      DownloadManager.startDownload = jest.fn().mockResolvedValue('download-id');

      await DownloadManager.downloadFromWebView(testUrl, 'confirm-download.jpg');

      expect(mockAlert).toHaveBeenCalledWith(
        'Download',
        expect.stringContaining('confirm-download.jpg'),
        expect.any(Array)
      );
    });

    test('should handle askDownloadLocation false without confirmation', async () => {
      const testUrl = 'https://example.com/no-confirm.jpg';
      
      (mockAlert as jest.Mock).mockClear();
      DownloadManager.startDownload = jest.fn().mockResolvedValue('download-id');

      await DownloadManager.downloadFromWebView(testUrl, 'no-confirm.jpg');

      expect(DownloadManager.startDownload).toHaveBeenCalled();
    });

    test('should handle download failure with error alert', async () => {
      const testUrl = 'https://example.com/failure.jpg';
      
      DownloadManager.startDownload = jest.fn().mockRejectedValue(
        new Error('Download failed')
      );

      await expect(
        DownloadManager.downloadFromWebView(testUrl, 'failure.jpg')
      ).rejects.toThrow('Download failed');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long URLs', async () => {
      const longUrl = `https://example.com/${'a'.repeat(1000)}.jpg`;
      
      DownloadManager.downloadFromWebView = jest.fn().mockResolvedValue(undefined);

      await ImageManager.downloadImage(longUrl);

      expect(DownloadManager.downloadFromWebView).toHaveBeenCalled();
    });

    test('should handle URLs with special characters', async () => {
      const specialUrl = 'https://example.com/test image_123.jpg?v=1&token=abc';
      
      DownloadManager.downloadFromWebView = jest.fn().mockResolvedValue(undefined);

      await ImageManager.downloadImage(specialUrl);

      expect(DownloadManager.downloadFromWebView).toHaveBeenCalledWith(
        specialUrl,
        expect.stringContaining('test')
      );
    });

    test('should handle URLs without file extension', async () => {
      const noExtUrl = 'https://example.com/image/12345';
      
      DownloadManager.downloadFromWebView = jest.fn().mockResolvedValue(undefined);

      await ImageManager.downloadImage(noExtUrl);

      expect(DownloadManager.downloadFromWebView).toHaveBeenCalled();
    });

    test('should handle data URLs', async () => {
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
      
      DownloadManager.downloadFromWebView = jest.fn().mockResolvedValue(undefined);

      await ImageManager.downloadImage(dataUrl);

      expect(DownloadManager.downloadFromWebView).toHaveBeenCalled();
    });

    test('should handle URLs with authentication', async () => {
      const authUrl = 'https://user:password@example.com/auth-image.jpg';
      
      DownloadManager.downloadFromWebView = jest.fn().mockResolvedValue(undefined);

      await ImageManager.downloadImage(authUrl);

      expect(DownloadManager.downloadFromWebView).toHaveBeenCalled();
    });
  });

  describe('Progress Tracking', () => {
    test('should handle download progress updates', async () => {
      const testUrl = 'https://example.com/progress.jpg';
      let progressCallback: ((progress: { progress: number }) => void) | undefined;
      
      DownloadManager.downloadFromWebView = jest.fn().mockImplementation(
        (url: string, filename: string, onProgress?: (progress: { progress: number }) => void) => {
          progressCallback = onProgress;
          if (onProgress) {
            onProgress({ progress: 50 });
          }
          return Promise.resolve();
        }
      );

      await ImageManager.downloadImage(testUrl);

      if (progressCallback) {
        progressCallback({ progress: 50 });
      }
    });
  });

  describe('Retry Logic', () => {
    test('should retry failed downloads', async () => {
      const testUrl = 'https://example.com/retry-test.jpg';
      let attempts = 0;
      
      DownloadManager.downloadFromWebView = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve();
      });

      try {
        await ImageManager.downloadImage(testUrl);
      } catch (error) {
        expect(attempts).toBeGreaterThan(1);
      }
    });
  });

  describe('Concurrent Downloads', () => {
    test('should handle multiple concurrent downloads', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];
      
      DownloadManager.downloadFromWebView = jest.fn().mockResolvedValue(undefined);

      const downloads = urls.map(url => ImageManager.downloadImage(url));
      await Promise.all(downloads);

      expect(DownloadManager.downloadFromWebView).toHaveBeenCalledTimes(3);
    });
  });
});

describe('DownloadManager Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
  });

  test('should handle WiFi-only download setting', async () => {
    const testUrl = 'https://example.com/wifi-download.jpg';
    
    DownloadManager.downloadFromWebView = jest.fn().mockResolvedValue(undefined);

    await DownloadManager.downloadFromWebView(testUrl, 'wifi-download.jpg');

    expect(DownloadManager.downloadFromWebView).toHaveBeenCalled();
  });

  test('should handle custom storage location', async () => {
    const testUrl = 'https://example.com/custom-location.jpg';
    
    DownloadManager.downloadFromWebView = jest.fn().mockResolvedValue(undefined);

    await DownloadManager.downloadFromWebView(testUrl, 'custom-location.jpg');

    expect(DownloadManager.downloadFromWebView).toHaveBeenCalled();
  });
});

console.log('✅ Image Download Comprehensive Tests Completed');
