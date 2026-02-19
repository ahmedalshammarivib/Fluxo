import SitePermissionsManager from '../utils/sitePermissionsManager';
import { useBrowserStore } from '../store/browserStore';

// Mock the browser store
jest.mock('../store/browserStore', () => ({
  useBrowserStore: {
    getState: jest.fn(),
  },
}));

describe('SitePermissionsManager', () => {
  // Setup mock data
  const mockSitePermissions = {
    camera: 'ask',
    location: 'block',
    microphone: 'allow',
    notifications: 'ask',
  };

  const mockUpdateSetting = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock implementation
    useBrowserStore.getState.mockReturnValue({
      settings: {
        sitePermissions: mockSitePermissions,
      },
      updateSetting: mockUpdateSetting,
    });
  });

  test('getCurrentPermissions returns site permissions from browser store', () => {
    const permissions = SitePermissionsManager.getCurrentPermissions();
    
    expect(useBrowserStore.getState).toHaveBeenCalled();
    expect(permissions).toEqual(mockSitePermissions);
  });

  test('updatePermission calls browser store updateSetting with correct parameters', async () => {
    await SitePermissionsManager.updatePermission('camera', 'allow');
    
    expect(mockUpdateSetting).toHaveBeenCalledWith('sitePermissions', {
      ...mockSitePermissions,
      camera: 'allow',
    });
  });

  test('getPermissionStatusText returns correct text for each status', () => {
    expect(SitePermissionsManager.getPermissionStatusText('ask')).toBe('Ask before accessing');
    expect(SitePermissionsManager.getPermissionStatusText('allow')).toBe('Always allow');
    expect(SitePermissionsManager.getPermissionStatusText('block')).toBe('Always block');
  });

  test('getPermissionItems returns array with correct structure', () => {
    const items = SitePermissionsManager.getPermissionItems();
    
    expect(items).toBeInstanceOf(Array);
    expect(items.length).toBe(4); // camera, location, microphone, notifications
    
    // Check structure of first item
    expect(items[0]).toHaveProperty('key');
    expect(items[0]).toHaveProperty('title');
    expect(items[0]).toHaveProperty('icon');
    expect(items[0]).toHaveProperty('color');
  });

  test('getPermissionOptions returns array with correct structure', () => {
    const options = SitePermissionsManager.getPermissionOptions();
    
    expect(options).toBeInstanceOf(Array);
    expect(options.length).toBe(3); // ask, allow, block
    
    // Check structure of first option
    expect(options[0]).toHaveProperty('id');
    expect(options[0]).toHaveProperty('title');
    expect(options[0]).toHaveProperty('icon');
    expect(options[0]).toHaveProperty('color');
  });

  test('applyPermissions handles errors gracefully', () => {
    // Mock console.error to prevent test output pollution
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    // Force getState to throw an error
    useBrowserStore.getState.mockImplementation(() => {
      throw new Error('Test error');
    });
    
    // Should not throw
    expect(() => SitePermissionsManager.applyPermissions()).not.toThrow();
    expect(console.error).toHaveBeenCalled();
    
    // Restore console.error
    console.error = originalConsoleError;
  });
});