import AppearanceManager from '../utils/appearanceManager';
import { useBrowserStore } from '../store/browserStore';

// Mock the React Native Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock the browser store
jest.mock('../store/browserStore', () => ({
  useBrowserStore: {
    getState: jest.fn(),
  },
}));

describe('AppearanceManager', () => {
  // Setup mock data and functions
  const mockSettings = {
    appearance: {
      theme: 'system',
      fontSize: 16,
      pageZoom: 100,
      toolbarLayout: 'default',
    },
  };
  
  const mockUpdateSetting = jest.fn();
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementations
    useBrowserStore.getState.mockReturnValue({
      settings: mockSettings,
      updateSetting: mockUpdateSetting,
    });
  });
  
  describe('getCurrentSettings', () => {
    it('should return the current appearance settings from the browser store', () => {
      const result = AppearanceManager.getCurrentSettings();
      
      expect(useBrowserStore.getState).toHaveBeenCalled();
      expect(result).toEqual(mockSettings.appearance);
    });
  });
  
  describe('updateSettings', () => {
    it('should update a specific appearance setting in the browser store', async () => {
      await AppearanceManager.updateSettings('theme', 'dark');
      
      expect(mockUpdateSetting).toHaveBeenCalledWith('appearance', {
        ...mockSettings.appearance,
        theme: 'dark',
      });
    });
    
    it('should handle errors when updating settings', async () => {
      // Setup mock to throw an error
      mockUpdateSetting.mockRejectedValueOnce(new Error('Update failed'));
      
      await expect(AppearanceManager.updateSettings('theme', 'dark')).rejects.toThrow('Update failed');
    });
  });
  
  describe('applySettings', () => {
    it('should apply all appearance settings', async () => {
      // Spy on the private methods
      const applyThemeSpy = jest.spyOn(AppearanceManager, 'applyTheme');
      const applyFontSizeSpy = jest.spyOn(AppearanceManager, 'applyFontSize');
      const applyPageZoomSpy = jest.spyOn(AppearanceManager, 'applyPageZoom');
      const applyToolbarLayoutSpy = jest.spyOn(AppearanceManager, 'applyToolbarLayout');
      
      await AppearanceManager.applySettings();
      
      expect(applyThemeSpy).toHaveBeenCalledWith(mockSettings.appearance.theme);
      expect(applyFontSizeSpy).toHaveBeenCalledWith(mockSettings.appearance.fontSize);
      expect(applyPageZoomSpy).toHaveBeenCalledWith(mockSettings.appearance.pageZoom);
      expect(applyToolbarLayoutSpy).toHaveBeenCalledWith(mockSettings.appearance.toolbarLayout);
    });
    
    it('should apply provided settings instead of getting from store', async () => {
      const customSettings = {
        theme: 'dark',
        fontSize: 18,
        pageZoom: 125,
        toolbarLayout: 'compact',
      };
      
      // Spy on the private methods
      const applyThemeSpy = jest.spyOn(AppearanceManager, 'applyTheme');
      const applyFontSizeSpy = jest.spyOn(AppearanceManager, 'applyFontSize');
      const applyPageZoomSpy = jest.spyOn(AppearanceManager, 'applyPageZoom');
      const applyToolbarLayoutSpy = jest.spyOn(AppearanceManager, 'applyToolbarLayout');
      
      await AppearanceManager.applySettings(customSettings);
      
      expect(applyThemeSpy).toHaveBeenCalledWith(customSettings.theme);
      expect(applyFontSizeSpy).toHaveBeenCalledWith(customSettings.fontSize);
      expect(applyPageZoomSpy).toHaveBeenCalledWith(customSettings.pageZoom);
      expect(applyToolbarLayoutSpy).toHaveBeenCalledWith(customSettings.toolbarLayout);
    });
  });
  
  describe('getThemeDisplayName', () => {
    it('should return the correct display name for each theme', () => {
      expect(AppearanceManager.getThemeDisplayName('system')).toBe('System default');
      expect(AppearanceManager.getThemeDisplayName('light')).toBe('Light');
      expect(AppearanceManager.getThemeDisplayName('dark')).toBe('Dark');
    });
    
    it('should return a default value for unknown themes', () => {
      // @ts-ignore - Testing invalid input
      expect(AppearanceManager.getThemeDisplayName('unknown')).toBe('System default');
    });
  });
  
  describe('getLayoutDisplayName', () => {
    it('should return the correct display name for each layout', () => {
      expect(AppearanceManager.getLayoutDisplayName('default')).toBe('Default');
      expect(AppearanceManager.getLayoutDisplayName('compact')).toBe('Compact');
      expect(AppearanceManager.getLayoutDisplayName('minimal')).toBe('Minimal');
    });
    
    it('should return a default value for unknown layouts', () => {
      // @ts-ignore - Testing invalid input
      expect(AppearanceManager.getLayoutDisplayName('unknown')).toBe('Default');
    });
  });
});