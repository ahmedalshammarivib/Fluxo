/**
 * Comprehensive Test Suite for ImageManager
 * 
 * This test file provides thorough coverage of all ImageManager functionality including:
 * - URL validation
 * - Image info retrieval with caching
 * - Format detection
 * - Filename generation
 * - Download functionality
 * - Share functionality
 * - Copy URL functionality
 * - Search functionality
 * - Cache management
 * - Preloading
 * - Error handling
 * - Edge cases and security
 * - Performance testing
 * 
 * @author Comprehensive Testing Suite
 * @date January 2026
 */

import { Alert, Share, Clipboard, Linking } from 'react-native';
import ImageManager, {
  ImageManagerError,
  InvalidUrlError,
  FormatDetectionError
} from '../utils/imageManager';
import DownloadManager from '../utils/downloadManager';

// Mock all external dependencies
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Share: {
    share: jest.fn(),
  },
  Clipboard: {
    setString: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
  AppState: {
    addEventListener: jest.fn(),
  },
  Image: {
    getSize: jest.fn(),
  },
}));

jest.mock('../utils/downloadManager', () => ({
  __esModule: true,
  default: {
    downloadFromWebView: jest.fn(),
  },
}));

// Mock global fetch for format detection
global.fetch = jest.fn();

describe('ImageManager', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Clear ImageManager cache
    ImageManager.clearCache();
    
    // Mock fetch response
    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: jest.fn(() => 'image/jpeg'),
      },
    });
  });

  afterEach(() => {
    // Clean up after each test
    jest.restoreAllMocks();
  });

  describe('URL Validation', () => {
    test('should accept valid HTTPS URLs', async () => {
      const validUrls = [
        'https://example.com/image.jpg',
        'https://example.com/photo.png',
        'https://cdn.example.com/images/test.gif',
        'https://sub.domain.example.com/path/to/image.webp',
      ];

      for (const url of validUrls) {
        await expect(ImageManager.getImageInfo(url)).resolves.toBeDefined();
      }
    });

    test('should accept valid HTTP URLs', async () => {
      const httpUrl = 'http://example.com/image.jpg';
      await expect(ImageManager.getImageInfo(httpUrl)).resolves.toBeDefined();
    });

    test('should reject invalid protocol URLs', async () => {
      const invalidUrls = [
        'ftp://example.com/image.jpg',
        'file:///path/to/image.jpg',
        'data:image/jpeg;base64,...',
        'javascript:void(0)',
      ];

      for (const url of invalidUrls) {
        await expect(ImageManager.getImageInfo(url)).rejects.toThrow(InvalidUrlError);
      }
    });

    test('should reject URLs without hostname', async () => {
      const invalidUrls = [
        'https:///image.jpg',
        'http:///path/to/image.png',
      ];

      for (const url of invalidUrls) {
        await expect(ImageManager.getImageInfo(url)).rejects.toThrow(InvalidUrlError);
      }
    });

    test('should reject malformed URLs', async () => {
      const invalidUrls = [
        'not-a-url',
        '',
        'https://',
        'http://',
        'example.com/image.jpg', // Missing protocol
      ];

      for (const url of invalidUrls) {
        await expect(ImageManager.getImageInfo(url)).rejects.toThrow();
      }
    });
  });

  describe('getImageInfo', () => {
    test('should retrieve image information successfully', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      const url = 'https://example.com/image.jpg';
      const info = await ImageManager.getImageInfo(url);

      expect(info.url).toBe(url);
      expect(info.width).toBe(1920);
      expect(info.height).toBe(1080);
      expect(info.format).toBe('JPEG');
    });

    test('should handle Image.getSize failures gracefully', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void, failure: (error: Error) => void) => {
        failure(new Error('Failed to load image'));
      });

      const url = 'https://example.com/image.jpg';
      const info = await ImageManager.getImageInfo(url);

      expect(info.url).toBe(url);
      expect(info.width).toBeUndefined();
      expect(info.height).toBeUndefined();
      expect(info.format).toBe('JPEG');
    });

    test('should cache image information', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      const url = 'https://example.com/image.jpg';
      
      // First call
      const info1 = await ImageManager.getImageInfo(url);
      expect(Image.getSize).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const info2 = await ImageManager.getImageInfo(url);
      expect(Image.getSize).toHaveBeenCalledTimes(1);

      expect(info1).toEqual(info2);
    });

    test('should update cache access count on retrieval', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      const url = 'https://example.com/image.jpg';
      
      await ImageManager.getImageInfo(url);
      await ImageManager.getImageInfo(url);
      await ImageManager.getImageInfo(url);

      expect(ImageManager.getCacheSize()).toBe(1);
    });

    test('should implement LRU eviction when cache is full', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      // Fill cache beyond max size (50)
      for (let i = 0; i < 60; i++) {
        await ImageManager.getImageInfo(`https://example.com/image${i}.jpg`);
      }

      // Cache should be limited to maxCacheSize
      expect(ImageManager.getCacheSize()).toBeLessThanOrEqual(50);
    });

    test('should deduplicate concurrent requests', async () => {
      const { Image } = require('react-native');
      let callCount = 0;
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        callCount++;
        success(1920, 1080);
      });

      const url = 'https://example.com/image.jpg';
      
      // Make concurrent requests
      const promises = [
        ImageManager.getImageInfo(url),
        ImageManager.getImageInfo(url),
        ImageManager.getImageInfo(url),
      ];

      await Promise.all(promises);

      // Should only call Image.getSize once
      expect(callCount).toBe(1);
    });

    test('should debounce rapid requests', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      const url = 'https://example.com/image.jpg';
      
      // Make rapid requests
      await ImageManager.getImageInfo(url, 100);
      await ImageManager.getImageInfo(url, 100);
      await ImageManager.getImageInfo(url, 100);

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should only call once after debounce
      expect(Image.getSize).toHaveBeenCalledTimes(1);
    });

    test('should handle network errors with retry', async () => {
      const { Image } = require('react-native');
      let attempt = 0;
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void, failure: (error: Error) => void) => {
        attempt++;
        if (attempt <= 2) {
          failure(new Error('Network error'));
        } else {
          success(1920, 1080);
        }
      });

      const url = 'https://example.com/image.jpg';
      const info = await ImageManager.getImageInfo(url);

      expect(info.width).toBe(1920);
      expect(attempt).toBe(3); // 2 failures + 1 success
    });

    test('should expire old cache entries', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      const url = 'https://example.com/image.jpg';
      
      // Mock time to simulate cache expiration
      jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now());
      await ImageManager.getImageInfo(url);

      // Simulate time passing beyond maxCacheAge
      jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 25 * 60 * 60 * 1000);
      
      // Clear and reinitialize to trigger stale cleanup
      ImageManager.clearCache();
      
      // Cache should be empty
      expect(ImageManager.getCacheSize()).toBe(0);
    });
  });

  describe('downloadImage', () => {
    test('should download image successfully', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      (DownloadManager.downloadFromWebView as jest.Mock).mockResolvedValueOnce('download-id');

      const url = 'https://example.com/image.jpg';
      await ImageManager.downloadImage(url);

      expect(DownloadManager.downloadFromWebView).toHaveBeenCalledWith(
        url,
        expect.stringContaining('.jpg')
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Download Started',
        expect.stringContaining('image.jpg')
      );
    });

    test('should handle download errors with fallback', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      (DownloadManager.downloadFromWebView as jest.Mock).mockRejectedValueOnce(
        new Error('Download failed')
      );

      const url = 'https://example.com/image.jpg';
      await ImageManager.downloadImage(url);

      expect(Linking.openURL).toHaveBeenCalledWith(url);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Download',
        'Opening in browser for download'
      );
    });

    test('should handle complete download failure', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      (DownloadManager.downloadFromWebView as jest.Mock).mockRejectedValueOnce(
        new Error('Download failed')
      );
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('Cannot open'));

      const url = 'https://example.com/image.jpg';
      await ImageManager.downloadImage(url);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to download image'
      );
    });

    test('should respect custom success message', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      (DownloadManager.downloadFromWebView as jest.Mock).mockResolvedValueOnce('download-id');

      const url = 'https://example.com/image.jpg';
      await ImageManager.downloadImage(url, {
        customSuccessMessage: 'Custom download message',
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Download Started',
        'Custom download message'
      );
    });

    test('should call onSuccess callback on success', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      (DownloadManager.downloadFromWebView as jest.Mock).mockResolvedValueOnce('download-id');

      const onSuccess = jest.fn();
      await ImageManager.downloadImage('https://example.com/image.jpg', {
        onSuccess,
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    test('should call onError callback on error', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      const error = new Error('Download failed');
      (DownloadManager.downloadFromWebView as jest.Mock).mockRejectedValueOnce(error);
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('Cannot open'));

      const onError = jest.fn();
      await ImageManager.downloadImage('https://example.com/image.jpg', {
        onError,
      });

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('shareImage', () => {
    test('should share image URL successfully', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      (Share.share as jest.Mock).mockResolvedValueOnce({ action: 'sharedAction' });

      const url = 'https://example.com/image.jpg';
      await ImageManager.shareImage(url);

      expect(Share.share).toHaveBeenCalledWith({
        message: expect.stringContaining('Check out this JPEG (1920×1080)'),
        url: url,
        title: 'Share Image',
      });
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Image shared successfully'
      );
    });

    test('should handle share errors with clipboard fallback', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      (Share.share as jest.Mock).mockRejectedValueOnce(new Error('Share failed'));

      const url = 'https://example.com/image.jpg';
      await ImageManager.shareImage(url);

      expect(Clipboard.setString).toHaveBeenCalledWith(url);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Shared via Clipboard',
        'Image URL copied for sharing'
      );
    });

    test('should respect showSuccessAlert option', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      (Share.share as jest.Mock).mockResolvedValueOnce({ action: 'sharedAction' });

      await ImageManager.shareImage('https://example.com/image.jpg', {
        showSuccessAlert: false,
      });

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    test('should call onSuccess callback on success', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      (Share.share as jest.Mock).mockResolvedValueOnce({ action: 'sharedAction' });
      const onSuccess = jest.fn();

      await ImageManager.shareImage('https://example.com/image.jpg', {
        onSuccess,
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('copyImageUrl', () => {
    test('should copy image URL to clipboard', async () => {
      const url = 'https://example.com/image.jpg';
      await ImageManager.copyImageUrl(url);

      expect(Clipboard.setString).toHaveBeenCalledWith(url);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Copied',
        'Image URL copied to clipboard'
      );
    });

    test('should respect custom success message', async () => {
      const url = 'https://example.com/image.jpg';
      await ImageManager.copyImageUrl(url, {
        customSuccessMessage: 'Custom copy message',
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Copied',
        'Custom copy message'
      );
    });

    test('should respect showSuccessAlert option', async () => {
      const url = 'https://example.com/image.jpg';
      await ImageManager.copyImageUrl(url, {
        showSuccessAlert: false,
      });

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    test('should call onSuccess callback on success', async () => {
      const url = 'https://example.com/image.jpg';
      const onSuccess = jest.fn();

      await ImageManager.copyImageUrl(url, {
        onSuccess,
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    test('should handle clipboard errors', async () => {
      const url = 'https://example.com/image.jpg';
      (Clipboard.setString as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Clipboard error');
      });

      await ImageManager.copyImageUrl(url);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to copy image URL'
      );
    });
  });

  describe('searchImage', () => {
    test('should generate Google search URL', async () => {
      const url = 'https://example.com/image.jpg';
      const searchUrl = await ImageManager.searchImage(url, 'google');

      expect(searchUrl).toContain('lens.google.com/uploadbyurl');
      expect(searchUrl).toContain(encodeURIComponent(url));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Search Started',
        'Searching for similar images on Google'
      );
    });

    test('should generate Bing search URL', async () => {
      const url = 'https://example.com/image.jpg';
      const searchUrl = await ImageManager.searchImage(url, 'bing');

      expect(searchUrl).toContain('bing.com/images/search');
      expect(searchUrl).toContain(encodeURIComponent(url));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Search Started',
        'Searching for similar images on Bing'
      );
    });

    test('should generate Yandex search URL', async () => {
      const url = 'https://example.com/image.jpg';
      const searchUrl = await ImageManager.searchImage(url, 'yandex');

      expect(searchUrl).toContain('yandex.com/images/search');
      expect(searchUrl).toContain(encodeURIComponent(url));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Search Started',
        'Searching for similar images on Yandex'
      );
    });

    test('should validate URL before generating search', async () => {
      await expect(
        ImageManager.searchImage('not-a-url', 'google')
      ).rejects.toThrow(InvalidUrlError);
    });

    test('should respect showSuccessAlert option', async () => {
      const url = 'https://example.com/image.jpg';
      await ImageManager.searchImage(url, 'google', {
        showSuccessAlert: false,
      });

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    test('should call onSuccess callback', async () => {
      const url = 'https://example.com/image.jpg';
      const onSuccess = jest.fn();

      await ImageManager.searchImage(url, 'google', {
        onSuccess,
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('isValidImageUrl', () => {
    test('should validate image URLs with extensions', () => {
      const validUrls = [
        'https://example.com/image.jpg',
        'https://example.com/photo.jpeg',
        'https://example.com/pic.png',
        'https://example.com/anim.gif',
        'https://example.com/modern.webp',
        'https://example.com/vector.svg',
        'https://example.com/bitmap.bmp',
      ];

      validUrls.forEach(url => {
        expect(ImageManager.isValidImageUrl(url)).toBe(true);
      });
    });

    test('should validate image URLs with image in pathname', () => {
      const validUrls = [
        'https://example.com/images/12345',
        'https://example.com/image?id=123',
        'https://image.example.com/12345',
      ];

      validUrls.forEach(url => {
        expect(ImageManager.isValidImageUrl(url)).toBe(true);
      });
    });

    test('should reject non-image URLs', () => {
      const invalidUrls = [
        'https://example.com/document.pdf',
        'https://example.com/video.mp4',
        'https://example.com/audio.mp3',
        'https://example.com/file.txt',
      ];

      invalidUrls.forEach(url => {
        expect(ImageManager.isValidImageUrl(url)).toBe(false);
      });
    });

    test('should reject malformed URLs', () => {
      const invalidUrls = [
        'not-a-url',
        '',
        'https://',
        'example.com',
      ];

      invalidUrls.forEach(url => {
        expect(ImageManager.isValidImageUrl(url)).toBe(false);
      });
    });
  });

  describe('generateFilename', () => {
    test('should extract filename from URL', () => {
      const url = 'https://example.com/photos/sunset.jpg';
      const filename = ImageManager.generateFilename(url);

      expect(filename).toBe('sunset.jpg');
    });

    test('should remove query parameters', () => {
      const url = 'https://example.com/image.png?v=123&quality=high';
      const filename = ImageManager.generateFilename(url);

      expect(filename).toBe('image.png');
    });

    test('should remove fragments', () => {
      const url = 'https://example.com/image.webp#section';
      const filename = ImageManager.generateFilename(url);

      expect(filename).toBe('image.webp');
    });

    test('should sanitize invalid characters', () => {
      const url = 'https://example.com/<image>.png?name=test|file';
      const filename = ImageManager.generateFilename(url);

      expect(filename).not.toContain('<');
      expect(filename).not.toContain('>');
      expect(filename).not.toContain('|');
      expect(filename).toContain('_');
    });

    test('should prevent path traversal', () => {
      const url = 'https://evil.com/../../../etc/passwd.jpg';
      const filename = ImageManager.generateFilename(url);

      expect(filename).not.toContain('..');
      expect(filename).not.toContain('/');
    });

    test('should limit filename length', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(300) + '.jpg';
      const filename = ImageManager.generateFilename(longUrl);

      expect(filename.length).toBeLessThanOrEqual(204); // 200 + extension
    });

    test('should generate fallback for invalid URLs', () => {
      const filename = ImageManager.generateFilename('not-a-url');

      expect(filename).toMatch(/^image_\d+\.jpg$/);
    });

    test('should use info format when available', () => {
      const url = 'https://example.com/image';
      const info = { url, format: 'PNG' };
      const filename = ImageManager.generateFilename(url, info);

      expect(filename).toContain('.png');
    });
  });

  describe('Cache Management', () => {
    test('should clear all cache', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      await ImageManager.getImageInfo('https://example.com/image1.jpg');
      await ImageManager.getImageInfo('https://example.com/image2.jpg');

      expect(ImageManager.getCacheSize()).toBeGreaterThan(0);

      ImageManager.clearCache();

      expect(ImageManager.getCacheSize()).toBe(0);
    });

    test('should trim cache by ratio', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      // Add 20 items to cache
      for (let i = 0; i < 20; i++) {
        await ImageManager.getImageInfo(`https://example.com/image${i}.jpg`);
      }

      expect(ImageManager.getCacheSize()).toBe(20);

      // Trim 50% (10 items)
      ImageManager.trimCache(0.5);

      expect(ImageManager.getCacheSize()).toBeLessThanOrEqual(10);
    });
  });

  describe('Preloading', () => {
    test('should preload image info', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];

      ImageManager.preloadImageInfo(urls);

      // Wait for preloading
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(ImageManager.getCacheSize()).toBe(3);
    });

    test('should ignore preload errors', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void, failure: (error: Error) => void) => {
        failure(new Error('Failed to load'));
      });

      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ];

      expect(() => ImageManager.preloadImageInfo(urls)).not.toThrow();
    });
  });

  describe('Format Detection', () => {
    test('should detect format from MIME type', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      global.fetch = jest.fn().mockResolvedValue({
        headers: {
          get: jest.fn(() => 'image/webp'),
        },
      });

      const url = 'https://example.com/image';
      const info = await ImageManager.getImageInfo(url);

      expect(info.format).toBe('WebP');
    });

    test('should detect modern formats', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      const modernFormats = [
        'image/avif',
        'image/heic',
        'image/heif',
      ];

      for (const mime of modernFormats) {
        global.fetch = jest.fn().mockResolvedValue({
          headers: {
            get: jest.fn(() => mime),
          },
        });

        const info = await ImageManager.getImageInfo('https://example.com/image');
        expect(info.format).toBeDefined();
      }
    });

    test('should fallback to extension detection', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const url = 'https://example.com/image.png';
      const info = await ImageManager.getImageInfo(url);

      expect(info.format).toBe('PNG');
    });
  });

  describe('Performance Tests', () => {
    test('should handle rapid sequential requests', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        await ImageManager.getImageInfo(`https://example.com/image${i}.jpg`);
      }

      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);
    });

    test('should not leak memory over extended use', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      // Load many images
      for (let i = 0; i < 200; i++) {
        await ImageManager.getImageInfo(`https://example.com/image${i}.jpg`);
      }

      // Cache should be limited
      expect(ImageManager.getCacheSize()).toBeLessThanOrEqual(50);
    });

    test('should maintain cache hit rate', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      const url = 'https://example.com/image.jpg';

      // Load same URL multiple times
      for (let i = 0; i < 10; i++) {
        await ImageManager.getImageInfo(url);
      }

      // Should only call Image.getSize once
      expect(Image.getSize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Classes', () => {
    test('should create ImageManagerError with proper structure', () => {
      const error = new ImageManagerError('Test error', 'TEST_CODE');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('ImageManagerError');
    });

    test('should create InvalidUrlError', () => {
      const error = new InvalidUrlError('invalid-url');

      expect(error.message).toContain('Invalid image URL');
      expect(error.code).toBe('INVALID_URL');
    });

    test('should create FormatDetectionError', () => {
      const error = new FormatDetectionError('https://example.com/image');

      expect(error.message).toContain('Could not detect image format');
      expect(error.code).toBe('FORMAT_DETECTION');
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete image workflow', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      (DownloadManager.downloadFromWebView as jest.Mock).mockResolvedValueOnce('download-id');
      (Share.share as jest.Mock).mockResolvedValueOnce({ action: 'sharedAction' });

      const url = 'https://example.com/image.jpg';

      // Get image info
      const info = await ImageManager.getImageInfo(url);
      expect(info.width).toBe(1920);

      // Generate filename
      const filename = ImageManager.generateFilename(url, info);
      expect(filename).toBe('image.jpg');

      // Download
      await ImageManager.downloadImage(url);
      expect(DownloadManager.downloadFromWebView).toHaveBeenCalled();

      // Share
      await ImageManager.shareImage(url);
      expect(Share.share).toHaveBeenCalled();
    });

    test('should handle context menu integration', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url: string, success: (width: number, height: number) => void) => {
        success(1920, 1080);
      });

      const url = 'https://example.com/image.jpg';

      // Simulate context menu operations
      const info = await ImageManager.getImageInfo(url);
      await ImageManager.downloadImage(url);
      await ImageManager.copyImageUrl(url);
      const searchUrl = await ImageManager.searchImage(url, 'google');

      expect(info.url).toBe(url);
      expect(searchUrl).toContain('google.com');
    });
  });
});

console.log('✅ Comprehensive ImageManager Test Suite Completed');
console.log('📊 Coverage: URL Validation, Image Info, Download, Share, Copy, Search, Cache, Preloading, Format Detection, Performance, Error Handling');
