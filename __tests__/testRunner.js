/**
 * Simple Test Runner for ImageManager
 */

const { Alert, Share, Clipboard, Linking, Image } = require('react-native');
const ImageManager = require('../utils/imageManager').default;

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

describe('ImageManager Basic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ImageManager.clearCache();
    
    Image.getSize.mockImplementation((url, success) => {
      success(1920, 1080);
    });

    Share.share.mockResolvedValue({ action: 'sharedAction' });
    Linking.openURL.mockResolvedValue(true);
  });

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

  test('should retrieve image information successfully', async () => {
    const url = 'https://example.com/image.jpg';
    const info = await ImageManager.getImageInfo(url);

    expect(info.url).toBe(url);
    expect(info.width).toBe(1920);
    expect(info.height).toBe(1080);
    expect(info.format).toBe('JPEG');
  });

  test('should copy image URL to clipboard', async () => {
    const url = 'https://example.com/image.jpg';
    await ImageManager.copyImageUrl(url);

    expect(Clipboard.setString).toHaveBeenCalledWith(url);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Copied',
      'Image URL copied to clipboard'
    );
  });

  test('should generate Google search URL', async () => {
    const url = 'https://example.com/test-image.jpg';
    const searchUrl = await ImageManager.searchImage(url, 'google');

    expect(searchUrl).toContain('lens.google.com/uploadbyurl');
    expect(searchUrl).toContain(encodeURIComponent(url));
  });

  test('should extract filename from URL', () => {
    const url = 'https://example.com/photos/sunset.jpg';
    const filename = ImageManager.generateFilename(url);

    expect(filename).toBe('sunset.jpg');
  });

  test('should clear cache', () => {
    expect(ImageManager.getCacheSize()).toBe(0);
  });
});

console.log('✅ ImageManager Basic Tests Completed');
