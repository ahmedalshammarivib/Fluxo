/**
 * Test Setup for ImageManager Tests
 * 
 * This file sets up the testing environment for ImageManager tests including:
 * - Mock configurations
 * - Global test utilities
 * - Test environment variables
 * - Cleanup functions
 * 
 * @author Test Configuration
 * @date January 2026
 */

import { TextEncoder, TextDecoder } from 'util';

// Polyfill for TextEncoder/TextDecoder if not available
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder as any;
}
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder as any;
}

// Suppress console warnings during tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.warn = (...args) => {
    // Suppress specific warnings during tests
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('Warning:') ||
       message.includes('Deprecated:') ||
       message.includes('React Native'))
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  console.error = (...args) => {
    // Suppress specific errors during tests
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('Network request failed') ||
       message.includes('Warning:'))
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
});

afterAll(() => {
  // Restore original console methods
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Global test utilities
export const createMockImageInfo = (overrides = {}) => ({
  url: 'https://example.com/image.jpg',
  width: 1920,
  height: 1080,
  format: 'JPEG',
  size: 102400,
  ...overrides,
});

export const createMockImageUrl = (id: number) =>
  `https://example.com/image${id}.jpg`;

export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const flushPromises = () =>
  new Promise(resolve => setImmediate(resolve));

// Test data generators
export const generateTestUrls = (count: number) =>
  Array.from({ length: count }, (_, i) => createMockImageUrl(i));

export const generateTestImageUrls = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    url: createMockImageUrl(i),
    width: 1920,
    height: 1080,
    format: 'JPEG',
  }));

// Performance measurement utilities
export const measurePerformance = async (
  fn: () => Promise<void>
): Promise<{ duration: number; result: void }> => {
  const start = Date.now();
  const result = await fn();
  return {
    duration: Date.now() - start,
    result,
  };
};

export const measureMemory = (fn: () => void) => {
  if (typeof performance !== 'undefined' && performance.memory) {
    const before = performance.memory.usedJSHeapSize;
    fn();
    const after = performance.memory.usedJSHeapSize;
    return {
      before,
      after,
      delta: after - before,
    };
  }

  fn();
  return null;
};

// Mock data generators
export const createMockImageData = (url: string) => ({
  url,
  src: url,
  alt: 'Test Image',
  tagName: 'IMG',
});

export const createMockLongPressData = (url: string) => ({
  src: url,
  alt: 'Test Image',
  tagName: 'IMG',
  elementBounds: { x: 0, y: 0, width: 100, height: 100 },
});

// Test assertion helpers
export const expectCacheSize = (expected: number) => {
  const { ImageManager } = require('../utils/imageManager');
  expect(ImageManager.getCacheSize()).toBe(expected);
};

export const expectCacheHit = () => {
  const { Image } = require('react-native');
  const callCountBefore = Image.getSize.mock.calls.length;
  return {
    toHaveBeenCalledTimes: (times: number) => {
      expect(Image.getSize.mock.calls.length - callCountBefore).toBe(times);
    },
  };
};

export const expectNetworkCallCount = (expected: number) => {
  const { Image } = require('react-native');
  expect(Image.getSize).toHaveBeenCalledTimes(expected);
};

// Test environment helpers
export const setTestEnvironment = (env: 'test' | 'development' | 'production') => {
  process.env.NODE_ENV = env;
};

export const getTestEnvironment = () => process.env.NODE_ENV || 'test';

export const isCI = () => process.env.CI === 'true';

// Mock request helpers
export const mockSuccessfulImageLoad = () => {
  const { Image } = require('react-native');
  Image.getSize.mockImplementation((url, success) => {
    success(1920, 1080);
  });
};

export const mockFailedImageLoad = () => {
  const { Image } = require('react-native');
  Image.getSize.mockImplementation((url, success, failure) => {
    failure(new Error('Failed to load image'));
  });
};

export const resetImageMock = () => {
  const { Image } = require('react-native');
  Image.getSize.mockReset();
};

// Fetch mock helpers
export const mockSuccessfulFetch = (contentType: string = 'image/jpeg') => {
  (global.fetch as jest.Mock).mockResolvedValue({
    headers: {
      get: jest.fn(() => contentType),
    },
  });
};

export const mockFailedFetch = () => {
  (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
};

export const resetFetchMock = () => {
  (global.fetch as jest.Mock).mockReset();
};

// Cleanup helpers
export const cleanupImageManager = () => {
  const { ImageManager } = require('../utils/imageManager');
  ImageManager.clearCache();
};

export const cleanupAllMocks = () => {
  jest.clearAllMocks();
  cleanupImageManager();
  resetImageMock();
  resetFetchMock();
};

// Export all for convenience
export default {
  createMockImageInfo,
  createMockImageUrl,
  waitFor,
  flushPromises,
  generateTestUrls,
  generateTestImageUrls,
  measurePerformance,
  measureMemory,
  createMockImageData,
  createMockLongPressData,
  expectCacheSize,
  expectCacheHit,
  expectNetworkCallCount,
  setTestEnvironment,
  getTestEnvironment,
  isCI,
  mockSuccessfulImageLoad,
  mockFailedImageLoad,
  resetImageMock,
  mockSuccessfulFetch,
  mockFailedFetch,
  resetFetchMock,
  cleanupImageManager,
  cleanupAllMocks,
};
