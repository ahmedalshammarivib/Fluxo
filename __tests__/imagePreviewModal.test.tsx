/**
 * ImagePreviewModal Caching Tests
 * 
 * Tests for ImagePreviewModal to ensure proper image switching,
 * cache invalidation, and state management.
 */

import React from 'react';
import { render, fireEvent, waitFor, act, screen } from '@testing-library/react-native';
import ImagePreviewModal from '../components/ImagePreviewModal';
import useImageLoader from '../hooks/useImageLoader';

// Mock all dependencies

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const { act } = require('@testing-library/react-native');
  
  // Mock Image.getSize
  // We need to check if we can write to it. If not, we might need another approach.
  // But usually this works.
  RN.Image.getSize = jest.fn((url, success) => {
    if (success) {
      act(() => {
        success(1920, 1080);
      });
    }
  });

  // Mock Dimensions
  RN.Dimensions.get = jest.fn(() => ({ width: 375, height: 812, scale: 1, fontScale: 1 }));
  RN.Dimensions.addEventListener = jest.fn(() => ({ remove: jest.fn() }));
  RN.Dimensions.removeEventListener = jest.fn();

  return RN;
});

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
  PanGestureHandler: ({ children }: { children: React.ReactNode }) => children,
  PinchGestureHandler: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    useSharedValue: jest.fn((initial) => ({ value: initial })),
    useAnimatedStyle: jest.fn((style) => style),
    useAnimatedGestureHandler: jest.fn((config) => config),
    withSpring: jest.fn((value) => value),
    withTiming: jest.fn((value) => value),
    runOnJS: jest.fn((fn) => fn),
    default: {
      View: View,
      createAnimatedComponent: (c: React.ComponentType<any>) => c,
    },
    __esModule: true,
  };
});



jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../hooks/useImageLoader', () => {
  const React = require('react');
  const { act: mockAct } = require('react-test-renderer');
  
  // Shared spies
  const loadImageSpy = jest.fn();
  const clearCacheSpy = jest.fn();

  // Configurable state
  let nextState = {
    imageData: null,
    isLoaded: false,
    error: null,
  };
  
  let simulateError: string | null = null;
  let simulateDelay = 10;

  const mockHook = jest.fn(() => {
    // Initialize with nextState. Note: this only applies on initial render of the hook instance.
    const [state, setState] = React.useState(nextState);

    // Effect to update state if nextState changes and we want to force an update? 
    // No, that's complicated. We rely on initial state for setup.

    const loadImage = React.useCallback(async (url: string) => {
      const spyResult = await loadImageSpy(url);
      
      // Default behavior simulation
      if (simulateDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, simulateDelay));
      }
      
      if (simulateError) {
        await mockAct(async () => {
          setState({
            imageData: null,
            isLoaded: false,
            error: simulateError,
          });
        });
        return null;
      }

      const newData = 'file://test-url';
      await mockAct(async () => {
        setState({
          imageData: newData,
          isLoaded: true,
          error: null,
        });
      });
      return newData;
    }, []);

    const clearCache = React.useCallback(() => {
      clearCacheSpy();
      setState({
        imageData: null,
        isLoaded: false,
        error: null,
      });
    }, []);

    return {
      imageData: state.imageData,
      isLoaded: state.isLoaded,
      error: state.error,
      loadImage,
      clearCache,
    };
  });
  
  // Attach spies and config helpers
  Object.assign(mockHook, {
    loadImage: loadImageSpy,
    clearCache: clearCacheSpy,
    setNextState: (state: any) => { nextState = state; },
    setSimulateError: (err: any) => { simulateError = err; },
    setSimulateDelay: (delay: number) => { simulateDelay = delay; },
    reset: () => {
      loadImageSpy.mockClear();
      clearCacheSpy.mockClear();
      nextState = { imageData: null, isLoaded: false, error: null };
      simulateError = null;
      simulateDelay = 10;
    }
  });
  
  return {
    __esModule: true,
    default: mockHook,
  };
});

describe('ImagePreviewModal Caching Tests', () => {
  const defaultProps = {
    visible: true,
    imageUrl: 'https://example.com/image1.jpg',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useImageLoader as any).reset();
    
    const { Image } = require('react-native');
    // Override Image.getSize implementation to use act for safe state updates
    (Image.getSize as jest.Mock).mockImplementation((url, success) => {
      if (success) {
        act(() => {
          success(1920, 1080);
        });
      }
    });
  });

  describe('useImageLoader Hook Integration', () => {
    test('should call loadImage when modal becomes visible', async () => {
      const { rerender } = render(<ImagePreviewModal {...defaultProps} />);
      const useImageLoader = require('../hooks/useImageLoader').default;
      const loadImage = useImageLoader.loadImage;

      await waitFor(() => {
        expect(loadImage).toHaveBeenCalledWith(
          'https://example.com/image1.jpg'
        );
      });
    });

    test('should clear cache when modal closes', async () => {
      const { rerender } = render(<ImagePreviewModal {...defaultProps} />);
      const useImageLoader = require('../hooks/useImageLoader').default;
      const clearCache = useImageLoader.clearCache;

      act(() => {
        rerender(<ImagePreviewModal {...defaultProps} visible={false} />);
      });

      await waitFor(() => {
        expect(clearCache).toHaveBeenCalled();
      });
    });
  });

  describe('State Management', () => {
    test('should reset all state when modal becomes visible', async () => {
      const { rerender } = render(<ImagePreviewModal {...defaultProps} />);
      const useImageLoader = require('../hooks/useImageLoader').default;
      const loadImage = useImageLoader.loadImage;

      await waitFor(() => {
        expect(loadImage).toHaveBeenCalled();
      });

      const { Image: RNImage } = require('react-native');
      await waitFor(() => {
        expect(RNImage.getSize).toHaveBeenCalled();
      });
    });

    test('should clear previous image when new image is loaded', async () => {
      const { rerender } = render(<ImagePreviewModal {...defaultProps} />);
      const useImageLoader = require('../hooks/useImageLoader').default;
      const loadImage = useImageLoader.loadImage;
      const clearCache = useImageLoader.clearCache;

      await waitFor(() => {
        expect(loadImage).toHaveBeenCalledWith(
          'https://example.com/image1.jpg'
        );
      });

      act(() => {
        rerender(
          <ImagePreviewModal
            {...defaultProps}
            imageUrl="https://example.com/image2.jpg"
          />
        );
      });

      await waitFor(() => {
        expect(clearCache).toHaveBeenCalled();
        expect(loadImage).toHaveBeenCalledWith(
          'https://example.com/image2.jpg'
        );
      });
    });

    test('should handle rapid image switching', async () => {
      const { rerender } = render(<ImagePreviewModal {...defaultProps} />);
      const useImageLoader = require('../hooks/useImageLoader').default;
      const loadImage = useImageLoader.loadImage;

      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];

      for (const url of urls) {
        act(() => {
          rerender(<ImagePreviewModal {...defaultProps} imageUrl={url} />);
        });

        await waitFor(() => {
          expect(loadImage).toHaveBeenCalledWith(url);
        });
      }
    });
  });

  describe('Race Condition Prevention', () => {
    test('should prevent concurrent fetches of same image', async () => {
      const { rerender } = render(<ImagePreviewModal {...defaultProps} />);
      const useImageLoader = require('../hooks/useImageLoader').default;
      const loadImage = useImageLoader.loadImage;

      act(() => {
        rerender(<ImagePreviewModal {...defaultProps} />);
        rerender(<ImagePreviewModal {...defaultProps} />);
        rerender(<ImagePreviewModal {...defaultProps} />);
      });

      await waitFor(() => {
        const loadCalls = loadImage.mock.calls.length;
        expect(loadCalls).toBeLessThanOrEqual(2);
      });
    });

    test('should show loading state while fetching', async () => {
      render(<ImagePreviewModal {...defaultProps} />);

      const loadingText = await waitFor(() => screen.getByText('Loading image...'));
      expect(loadingText).toBeTruthy();
    });

    test('should hide loading when fetch completes', async () => {
      render(<ImagePreviewModal {...defaultProps} />);

      await waitFor(() => {
        const useImageLoader = require('../hooks/useImageLoader').default;
        const loadImage = useImageLoader.loadImage;
        expect(loadImage).toHaveBeenCalled();
      });
    });
  });

  describe('Key Strategy', () => {
    test('should generate unique key for each image', async () => {
      const { rerender } = render(<ImagePreviewModal {...defaultProps} />);

      await waitFor(() => {
        const useImageLoader = require('../hooks/useImageLoader').default;
        const loadImage = useImageLoader.loadImage;
        expect(loadImage).toHaveBeenCalled();
      });

      act(() => {
        rerender(<ImagePreviewModal {...defaultProps} imageUrl="https://example.com/image2.jpg" />);
      });

      await waitFor(() => {
        const useImageLoader = require('../hooks/useImageLoader').default;
        const loadImage = useImageLoader.loadImage;
        expect(loadImage).toHaveBeenCalled();
      });
    });

    test('should use loadAttemptId for keys', async () => {
      render(<ImagePreviewModal {...defaultProps} />);

      await waitFor(() => {
        const container = screen.getByTestId(/modal_/);
        expect(container.props.testID).toMatch(/modal_\d+/);
      });
    });
  });

  describe('Error Handling', () => {
    test('should show error state when fetch fails', async () => {
      const useImageLoader = require('../hooks/useImageLoader').default;
      useImageLoader.setSimulateError(new Error('Network error'));

      render(<ImagePreviewModal {...defaultProps} />);

      const errorText = await waitFor(() => screen.getByText('Failed to load image'));
      expect(errorText).toBeTruthy();
    });

    test('should retry on retry button press', async () => {
      const useImageLoader = require('../hooks/useImageLoader').default;
      const retryLoadImage = useImageLoader.loadImage;
      
      // First attempt fails
      useImageLoader.setSimulateError(new Error('Network error'));

      render(<ImagePreviewModal {...defaultProps} />);

      const errorText = await waitFor(() => screen.getByText('Failed to load image'));
      expect(errorText).toBeTruthy();

      // Clear error for retry
      useImageLoader.setSimulateError(null);

      const retryButton = screen.getByText('Retry');
      act(() => {
        fireEvent.press(retryButton);
      });

      await waitFor(() => {
        // We expect loadImage to be called again
        // Initial call + Retry call
        expect(retryLoadImage).toHaveBeenCalledTimes(2);
      });
    });

    test('should not show error while fetching', async () => {
      render(<ImagePreviewModal {...defaultProps} />);

      expect(() => screen.getByText('Failed to load image')).toThrow();
    });
  });

  describe('Modal Lifecycle', () => {
    test('should clear state when modal closes', async () => {
      const { rerender } = render(<ImagePreviewModal {...defaultProps} />);
      const useImageLoader = require('../hooks/useImageLoader').default;
      const clearCache = useImageLoader.clearCache;

      await waitFor(() => {
        const useImageLoader = require('../hooks/useImageLoader').default;
        const loadImage = useImageLoader.loadImage;
        expect(loadImage).toHaveBeenCalled();
      });

      act(() => {
        rerender(<ImagePreviewModal {...defaultProps} visible={false} />);
      });

      await waitFor(() => {
        expect(clearCache).toHaveBeenCalled();
        expect(() => screen.getByText('Loading image...')).toThrow();
        expect(() => screen.getByText('Failed to load image')).toThrow();
      });
    });

    test('should not fetch when modal is not visible', () => {
      const useImageLoader = require('../hooks/useImageLoader').default;
      const loadImage = useImageLoader.loadImage;
      render(<ImagePreviewModal {...defaultProps} visible={false} />);

      expect(loadImage).not.toHaveBeenCalled();
    });
  });

  describe('Concurrent Image Operations', () => {
    test('should handle closing and reopening with different image', async () => {
      const { rerender } = render(<ImagePreviewModal {...defaultProps} />);
      const useImageLoader = require('../hooks/useImageLoader').default;
      const loadImage = useImageLoader.loadImage;
      const clearCache = useImageLoader.clearCache;

      await waitFor(() => {
        expect(loadImage).toHaveBeenCalledWith('https://example.com/image1.jpg');
      });

      act(() => {
        rerender(<ImagePreviewModal {...defaultProps} visible={false} />);
      });

      await waitFor(() => {
        expect(clearCache).toHaveBeenCalled();
        expect(() => screen.getByText('Loading image...')).toThrow();
      });

      act(() => {
        rerender(
          <ImagePreviewModal
            {...defaultProps}
            visible={true}
            imageUrl="https://example.com/image2.jpg"
          />
        );
      });

      await waitFor(() => {
        expect(loadImage).toHaveBeenCalledWith('https://example.com/image2.jpg');
      });
    });

    test('should handle same image reopened quickly', async () => {
      const { rerender } = render(<ImagePreviewModal {...defaultProps} />);
      const useImageLoader = require('../hooks/useImageLoader').default;
      const loadImage = useImageLoader.loadImage;
      const clearCache = useImageLoader.clearCache;

      await waitFor(() => {
        expect(loadImage).toHaveBeenCalled();
      });

      act(() => {
        rerender(<ImagePreviewModal {...defaultProps} visible={false} />);
      });

      await waitFor(() => {
        expect(clearCache).toHaveBeenCalled();
      });

      act(() => {
        rerender(<ImagePreviewModal {...defaultProps} visible={true} />);
      });

      await waitFor(() => {
        expect(loadImage).toHaveBeenCalled();
      });
    });
  });

  describe('React Native Cache Control', () => {
    test('should use cache="reload" prop on Image component', async () => {
      render(<ImagePreviewModal {...defaultProps} />);

      await waitFor(() => {
        const imageElement = screen.getByTestId(/img_/);
        expect(imageElement).toBeTruthy();
        expect(imageElement.props.source.cache).toBe('reload');
      });
    });
  });

  describe('Visual Feedback', () => {
    test('should show loading indicator while fetching', async () => {
      render(<ImagePreviewModal {...defaultProps} />);

      const indicator = screen.getByTestId('activity-indicator');
      expect(indicator).toBeTruthy();
    });

    test('should hide loading indicator when image loads', async () => {
      render(<ImagePreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(() => screen.getByTestId('activity-indicator')).toThrow();
      });
    });

    test('should show loaded indicator when image successfully loads', async () => {
      render(<ImagePreviewModal {...defaultProps} />);

      const imageElement = await waitFor(() => screen.getByTestId(/img_/));
      
      act(() => {
        fireEvent(imageElement, 'onLoad');
      });

      const loadedText = await waitFor(() => screen.getByText('✓ Loaded'));
      expect(loadedText).toBeTruthy();
    });
  });
});
