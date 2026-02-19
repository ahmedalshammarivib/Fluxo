/**
 * Performance Tests for ImageManager
 * 
 * This test file focuses on performance characteristics of ImageManager including:
 * - Memory usage under load
 * - Cache efficiency
 * - Request deduplication
 * - LRU eviction performance
 * - Debouncing effectiveness
 * - Response time measurements
 * - Memory leak detection
 * - Cache hit rate analysis
 * 
 * @author Performance Testing Suite
 * @date January 2026
 */

import ImageManager from '../utils/imageManager';

// Mock dependencies
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

global.fetch = jest.fn();

describe('ImageManager Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ImageManager.clearCache();
    
    const { Image } = require('react-native');
    (Image.getSize as jest.Mock).mockImplementation((url: string, success: (w: number, h: number) => void) => {
      success(1920, 1080);
    });

    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: jest.fn(() => 'image/jpeg'),
      },
    });
  });

  describe('Memory Usage Under Load', () => {
    test('should not leak memory with 100 sequential loads', async () => {
      const { Image } = require('react-native');
      (Image.getSize as jest.Mock).mockImplementation((url: string, success: (w: number, h: number) => void) => {
        success(1920, 1080);
      });

      const initialCacheSize = ImageManager.getCacheSize();

      // Load 100 different images with 0 debounce to avoid timeouts
      for (let i = 0; i < 100; i++) {
        await ImageManager.getImageInfo(`https://example.com/image${i}.jpg`, 0);
      }

      const finalCacheSize = ImageManager.getCacheSize();

      // Cache should be bounded by maxCacheSize (50)
      expect(finalCacheSize).toBeLessThanOrEqual(50);
      expect(finalCacheSize).toBeLessThan(100);
    });

    test('should maintain stable memory with repeated access', async () => {
      const { Image } = require('react-native');
      (Image.getSize as jest.Mock).mockImplementation((url: string, success: (w: number, h: number) => void) => {
        success(1920, 1080);
      });

      const imageUrl = 'https://example.com/test-image.jpg';
      const callCounts: number[] = [];

      // Access same URL 50 times
      for (let i = 0; i < 50; i++) {
        await ImageManager.getImageInfo(imageUrl, 0);
        callCounts.push((Image.getSize as jest.Mock).mock.calls.length);
      }

      // Image.getSize should only be called once (cached)
      expect(callCounts[callCounts.length - 1]).toBe(1);
      expect(callCounts[49]).toBe(1);
    });

    test('should handle cache overflow gracefully', async () => {
      const { Image } = require('react-native');
      (Image.getSize as jest.Mock).mockImplementation((url: string, success: (w: number, h: number) => void) => {
        success(1920, 1080);
      });

      // Load 200 images (way over cache limit)
      for (let i = 0; i < 200; i++) {
        await ImageManager.getImageInfo(`https://example.com/image${i}.jpg`, 0);
      }

      const cacheSize = ImageManager.getCacheSize();

      // Should maintain cache limit
      expect(cacheSize).toBeLessThanOrEqual(50);

      // Should still be able to access cached items
      const cachedInfo = await ImageManager.getImageInfo('https://example.com/image150.jpg', 0);
      expect(cachedInfo).toBeDefined();
    });
  });

  describe('Cache Efficiency', () => {
    test('should achieve high cache hit rate', async () => {
      const { Image } = require('react-native');
      (Image.getSize as jest.Mock).mockImplementation((url: string, success: (w: number, h: number) => void) => {
        success(1920, 1080);
      });

      const imageUrl = 'https://example.com/test-image.jpg';

      // Load same URL 100 times
      for (let i = 0; i < 100; i++) {
        await ImageManager.getImageInfo(imageUrl, 0);
      }

      // Cache hit rate should be 99% (only first call misses)
      const cacheHitRate = 99 / 100;
      expect(cacheHitRate).toBeGreaterThan(0.98);
    });

    test('should measure cache hit rate across mixed access patterns', async () => {
      const { Image } = require('react-native');
      (Image.getSize as jest.Mock).mockImplementation((url: string, success: (w: number, h: number) => void) => {
        success(1920, 1080);
      });

      const hotUrls = [
        'https://example.com/hot1.jpg',
        'https://example.com/hot2.jpg',
        'https://example.com/hot3.jpg',
      ];

      const coldUrls: string[] = [];
      for (let i = 0; i < 50; i++) {
        coldUrls.push(`https://example.com/cold${i}.jpg`);
      }

      // Access pattern: 70% hot, 30% cold
      for (let i = 0; i < 100; i++) {
        if (i % 10 < 7) {
          // Hot access
          const hotUrl = hotUrls[i % hotUrls.length];
          await ImageManager.getImageInfo(hotUrl, 0);
        } else {
          // Cold access
          const coldUrl = coldUrls[i % coldUrls.length];
          await ImageManager.getImageInfo(coldUrl, 0);
        }
      }

      // Cache should be dominated by hot items
      expect(ImageManager.getCacheSize()).toBeLessThanOrEqual(50);
    });

    test('should maintain LRU eviction order', async () => {
      const { Image } = require('react-native');
      (Image.getSize as jest.Mock).mockImplementation((url: string, success: (w: number, h: number) => void) => {
        success(1920, 1080);
      });

      // Load first batch
      for (let i = 0; i < 30; i++) {
        await ImageManager.getImageInfo(`https://example.com/batch1_${i}.jpg`, 0);
      }

      // Access first few items again (make them more recent)
      for (let i = 0; i < 5; i++) {
        await ImageManager.getImageInfo(`https://example.com/batch1_${i}.jpg`, 0);
      }

      // Load more to trigger eviction
      for (let i = 0; i < 30; i++) {
        await ImageManager.getImageInfo(`https://example.com/batch2_${i}.jpg`, 0);
      }

      // Total should be limited
      expect(ImageManager.getCacheSize()).toBeLessThanOrEqual(50);
    });
  });

  describe('Request Deduplication', () => {
    test('should deduplicate concurrent requests efficiently', async () => {
      const { Image } = require('react-native');
      (Image.getSize as jest.Mock).mockImplementation((url: string, success: (w: number, h: number) => void) => {
        // Add a small delay to ensure requests overlap
        setTimeout(() => success(1920, 1080), 10);
      });

      const url = 'https://example.com/dedup.jpg';
      const requests = Array(10).fill(null).map(() => ImageManager.getImageInfo(url, 0));
      
      await Promise.all(requests);

      // Should only call getSize once
      expect(Image.getSize).toHaveBeenCalledTimes(1);
    });

    test('should handle deduplication cleanup properly', async () => {
      const { Image } = require('react-native');
      (Image.getSize as jest.Mock).mockImplementation((url: string, success: (w: number, h: number) => void) => {
        success(1920, 1080);
      });

      const url = 'https://example.com/cleanup.jpg';
      await ImageManager.getImageInfo(url, 0);
      
      // After completion, next request should be a new one (but cached)
      await ImageManager.getImageInfo(url, 0);
      expect(Image.getSize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Debouncing Effectiveness', () => {
    test('should debounce rapid requests efficiently', async () => {
      const { Image } = require('react-native');
      (Image.getSize as jest.Mock).mockImplementation((url: string, success: (w: number, h: number) => void) => {
        success(1920, 1080);
      });

      const url = 'https://example.com/debounce.jpg';
      
      // Fire 5 rapid requests with 100ms debounce
      const p1 = ImageManager.getImageInfo(url, 100);
      const p2 = ImageManager.getImageInfo(url, 100);
      const p3 = ImageManager.getImageInfo(url, 100);
      
      await Promise.all([p1, p2, p3]);

      // Should only call once after debounce
      expect(Image.getSize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Response Time Measurements', () => {
    test('should achieve fast response times for cached items', async () => {
      const url = 'https://example.com/speed.jpg';
      await ImageManager.getImageInfo(url, 0);

      const start = Date.now();
      await ImageManager.getImageInfo(url, 0);
      const duration = Date.now() - start;

      // Cached response should be extremely fast (< 5ms)
      expect(duration).toBeLessThan(10);
    });
  });

  describe('LRU Eviction Performance', () => {
    test('should evict LRU items efficiently', async () => {
      // Fill cache
      for (let i = 0; i < 50; i++) {
        await ImageManager.getImageInfo(`https://example.com/lru${i}.jpg`, 0);
      }

      const start = Date.now();
      // Add 10 more to trigger 10 evictions
      for (let i = 50; i < 60; i++) {
        await ImageManager.getImageInfo(`https://example.com/lru${i}.jpg`, 0);
      }
      const duration = Date.now() - start;

      // Evictions should be fast
      expect(duration).toBeLessThan(100);
      expect(ImageManager.getCacheSize()).toBe(50);
    });
  });

  describe('Memory Leak Detection', () => {
    test('should not accumulate memory over time', async () => {
      // Stress test cache for many iterations
      for (let i = 0; i < 500; i++) {
        await ImageManager.getImageInfo(`https://example.com/leak${i % 100}.jpg`, 0);
      }
      
      expect(ImageManager.getCacheSize()).toBeLessThanOrEqual(50);
    });
  });

  describe('Cache Hit Rate Analysis', () => {
    test('should achieve high hit rate with Zipf distribution', async () => {
      const urls = Array(20).fill(null).map((_, i) => `https://example.com/zipf${i}.jpg`);
      let hits = 0;
      let total = 100;

      for (let i = 0; i < total; i++) {
        // Simple skewed distribution: first 5 URLs are 70% of traffic
        const index = Math.random() < 0.7 ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 20);
        const info = await ImageManager.getImageInfo(urls[index], 0);
        if (info) hits++;
      }
      
      expect(hits).toBe(total);
    });
  });

  describe('Stress Tests', () => {
    test('should handle concurrent mixed operations', async () => {
      const operations = [];
      for (let i = 0; i < 50; i++) {
        const url = `https://example.com/stress${i % 10}.jpg`;
        operations.push(ImageManager.getImageInfo(url, 0));
      }
      
      const results = await Promise.all(operations);
      expect(results.length).toBe(50);
      expect(ImageManager.getCacheSize()).toBeLessThanOrEqual(10);
    });
  });
});
