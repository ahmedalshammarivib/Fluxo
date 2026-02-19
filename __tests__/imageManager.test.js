/**
 * ImageManager Tests
 * 
 * Tests for ImageManager functionality
 */

const { Alert, Share, Clipboard, Linking } = require('react-native');
const ImageManager = require('../utils/imageManager').default;
const DownloadManager = require('../utils/downloadManager').default;

// Mock all dependencies
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

describe('ImageManager', () => {
  const mockAlert = Alert.alert;
  const mockClipboard = Clipboard.setString;
  const mockShare = Share.share;
  const mockLinking = Linking.openURL;

  beforeEach(() => {
    jest.clearAllMocks();
    ImageManager.clearCache();
    
    const { Image } = require('react-native');
    Image.getSize.mockImplementation((url, success) => {
      success(1920, 1080);
    });

    mockShare.mockResolvedValue({ action: 'sharedAction' });
    mockLinking.mockResolvedValue(true);
  });

  describe('URL Validation', () => {
    test('should validate image URLs correctly', () => {
      const validUrls = [
        'https://example.com/image.jpg',
        'https://example.com/photo.png',
        'https://example.com/pic.gif',
        'https://example.com/image.webp'
      ];
      
      const invalidUrls = [
        'https://example.com/document.pdf',
        'https://example.com/video.mp4',
        'not-a-url',
        ''
      ];
      
      validUrls.forEach(url => {
        expect(ImageManager.isValidImageUrl(url)).toBe(true);
      });
      
      invalidUrls.forEach(url => {
        expect(ImageManager.isValidImageUrl(url)).toBe(false);
      });
    });
  });

  describe('getImageInfo', () => {
    test('should retrieve image information successfully', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url, success) => {
        success(1920, 1080);
      });

      const url = 'https://example.com/image.jpg';
      const info = await ImageManager.getImageInfo(url);

      expect(info.url).toBe(url);
      expect(info.width).toBe(1920);
      expect(info.height).toBe(1080);
      expect(info.format).toBe('JPEG');
    });

    test('should cache image information', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url, success) => {
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

    test('should implement LRU eviction when cache is full', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url, success) => {
        success(1920, 1080);
      });

      // Fill cache beyond max size (50)
      for (let i = 0; i < 60; i++) {
        await ImageManager.getImageInfo(`https://example.com/image${i}.jpg`);
      }

      // Cache should be limited to maxCacheSize
      expect(ImageManager.getCacheSize()).toBeLessThanOrEqual(50);
    });
  });

  describe('downloadImage', () => {
    test('should download image successfully', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url, success) => {
        success(1920, 1080);
      });

      DownloadManager.downloadFromWebView.mockResolvedValueOnce('download-id');

      const url = 'https://example.com/image.jpg';
      await ImageManager.downloadImage(url);

      expect(DownloadManager.downloadFromWebView).toHaveBeenCalledWith(
        url,
        expect.stringContaining('.jpg')
      );
      expect(mockAlert).toHaveBeenCalledWith(
        'Download Started',
        expect.stringContaining('image.jpg')
      );
    });
  });

  describe('shareImage', () => {
    test('should share image URL successfully', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url, success) => {
        success(1920, 1080);
      });

      mockShare.mockResolvedValueOnce({ action: 'sharedAction' });

      const url = 'https://example.com/image.jpg';
      await ImageManager.shareImage(url);

      expect(mockShare).toHaveBeenCalledWith({
        message: expect.stringContaining('Check out this JPEG'),
        url: url,
        title: 'Share Image'
      });
      expect(mockAlert).toHaveBeenCalledWith(
        'Success',
        'Image shared successfully'
      );
    });
  });

  describe('copyImageUrl', () => {
    test('should copy image URL to clipboard', async () => {
      const url = 'https://example.com/image.jpg';
      await ImageManager.copyImageUrl(url);

      expect(mockClipboard).toHaveBeenCalledWith(url);
      expect(mockAlert).toHaveBeenCalledWith(
        'Copied',
        'Image URL copied to clipboard'
      );
    });
  });

  describe('searchImage', () => {
    test('should generate Google search URL', async () => {
      const url = 'https://example.com/test-image.jpg';
      const searchUrl = await ImageManager.searchImage(url, 'google');

      expect(searchUrl).toContain('lens.google.com/uploadbyurl');
      expect(searchUrl).toContain(encodeURIComponent(url));
      expect(mockAlert).toHaveBeenCalledWith(
        'Search Started',
        'Searching for similar images on Google'
      );
    });

    test('should generate Bing search URL', async () => {
      const url = 'https://example.com/test-image.jpg';
      const searchUrl = await ImageManager.searchImage(url, 'bing');

      expect(searchUrl).toContain('bing.com/images/search');
      expect(searchUrl).toContain(encodeURIComponent(url));
    });

    test('should validate URL before generating search', async () => {
      await expect(
        ImageManager.searchImage('not-a-url', 'google')
      ).rejects.toThrow();
    });
  });

  describe('generateFilename', () => {
    test('should extract filename from URL', () => {
      const url = 'https://example.com/photos/sunset.jpg';
      const filename = ImageManager.generateFilename(url);

      expect(filename).toBe('sunset.jpg');
    });

    test('should remove query parameters', () => {
      const url = 'https://example.com/image.png?v=123';
      const filename = ImageManager.generateFilename(url);

      expect(filename).toBe('image.png');
    });

    test('should sanitize invalid characters', () => {
      const url = 'https://example.com/<image>.png';
      const filename = ImageManager.generateFilename(url);

      expect(filename).not.toContain('<');
      expect(filename).not.toContain('>');
      expect(filename).toContain('_');
    });
  });

  describe('Cache Management', () => {
    test('should clear all cache', async () => {
      const { Image } = require('react-native');
      Image.getSize.mockImplementation((url, success) => {
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
      Image.getSize.mockImplementation((url, success) => {
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
      Image.getSize.mockImplementation((url, success) => {
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
  });
});

console.log('✅ ImageManager Tests Completed');
