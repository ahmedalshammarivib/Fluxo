import AccessibilityManager from '../utils/accessibilityManager';
import { useBrowserStore } from '../store/browserStore';

// Mock the browser store
jest.mock('../store/browserStore', () => ({
  useBrowserStore: {
    getState: jest.fn(),
  },
}));

// Mock Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('AccessibilityManager', () => {
  // Mock console.error to prevent test output pollution
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = jest.fn();
  });
  
  afterEach(() => {
    console.error = originalConsoleError;
    jest.clearAllMocks();
  });

  describe('getCurrentSettings', () => {
    it('should return the current accessibility settings from the browser store', () => {
      // Mock data
      const mockAccessibilitySettings = {
        textSize: 1.2,
        highContrastMode: true,
        reduceMotion: false,
        touchAssistance: true,
        screenReaderOptimized: false,
      };
      
      // Setup mock
      useBrowserStore.getState.mockReturnValue({
        settings: {
          accessibility: mockAccessibilitySettings,
        },
      });
      
      // Execute
      const result = AccessibilityManager.getCurrentSettings();
      
      // Assert
      expect(result).toEqual(mockAccessibilitySettings);
      expect(useBrowserStore.getState).toHaveBeenCalled();
    });
  });

  describe('updateSetting', () => {
    it('should update a specific accessibility setting in the browser store', async () => {
      // Mock data
      const mockUpdateSetting = jest.fn().mockResolvedValue(undefined);
      const mockCurrentSettings = {
        textSize: 1.0,
        highContrastMode: false,
        reduceMotion: false,
        touchAssistance: false,
        screenReaderOptimized: false,
      };
      
      // Setup mock
      useBrowserStore.getState.mockReturnValue({
        settings: {
          accessibility: mockCurrentSettings,
        },
        updateSetting: mockUpdateSetting,
      });
      
      // Execute
      await AccessibilityManager.updateSetting('textSize', 1.5);
      
      // Assert
      expect(mockUpdateSetting).toHaveBeenCalledWith('accessibility', {
        ...mockCurrentSettings,
        textSize: 1.5,
      });
    });

    it('should handle errors when updating settings', async () => {
      // Mock data
      const mockError = new Error('Update failed');
      const mockUpdateSetting = jest.fn().mockRejectedValue(mockError);
      
      // Setup mock
      useBrowserStore.getState.mockReturnValue({
        settings: {
          accessibility: {},
        },
        updateSetting: mockUpdateSetting,
      });
      
      // Execute and assert
      await expect(AccessibilityManager.updateSetting('textSize', 1.5)).rejects.toThrow(mockError);
      expect(console.error).toHaveBeenCalledWith('Failed to update accessibility setting:', mockError);
    });
  });

  describe('applySettings', () => {
    it('should apply all accessibility settings', async () => {
      // Mock data
      const mockSettings = {
        textSize: 1.2,
        highContrastMode: true,
        reduceMotion: true,
        touchAssistance: false,
        screenReaderOptimized: true,
      };
      
      // Setup spy on private methods
      const applyTextSizeSpy = jest.spyOn(AccessibilityManager, 'applyTextSize');
      const applyHighContrastModeSpy = jest.spyOn(AccessibilityManager, 'applyHighContrastMode');
      const applyReducedMotionSpy = jest.spyOn(AccessibilityManager, 'applyReducedMotion');
      const applyTouchAssistanceSpy = jest.spyOn(AccessibilityManager, 'applyTouchAssistance');
      const applyScreenReaderOptimizationsSpy = jest.spyOn(AccessibilityManager, 'applyScreenReaderOptimizations');
      
      // Setup mock
      useBrowserStore.getState.mockReturnValue({
        settings: {
          accessibility: mockSettings,
        },
      });
      
      // Execute
      await AccessibilityManager.applySettings();
      
      // Assert
      expect(applyTextSizeSpy).toHaveBeenCalledWith(mockSettings.textSize);
      expect(applyHighContrastModeSpy).toHaveBeenCalledWith(mockSettings.highContrastMode);
      expect(applyReducedMotionSpy).toHaveBeenCalledWith(mockSettings.reduceMotion);
      expect(applyTouchAssistanceSpy).toHaveBeenCalledWith(mockSettings.touchAssistance);
      expect(applyScreenReaderOptimizationsSpy).toHaveBeenCalledWith(mockSettings.screenReaderOptimized);
    });

    it('should handle errors when applying settings', async () => {
      // Mock data
      const mockError = new Error('Apply failed');
      
      // Setup mock
      useBrowserStore.getState.mockReturnValue({
        settings: {
          accessibility: {},
        },
      });
      
      // Force an error
      jest.spyOn(AccessibilityManager, 'getCurrentSettings').mockImplementation(() => {
        throw mockError;
      });
      
      // Execute
      await AccessibilityManager.applySettings();
      
      // Assert
      expect(console.error).toHaveBeenCalledWith('Failed to apply accessibility settings:', mockError);
    });
  });
});