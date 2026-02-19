import AsyncStorage from '@react-native-async-storage/async-storage';
import SiteSpecificPermissions from '../utils/siteSpecificPermissions';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('SiteSpecificPermissions', () => {
  const SITE_PERMISSIONS_KEY = '@browser_site_specific_permissions';
  
  // Sample test data
  const testDomain = 'example.com';
  const testPermissions = {
    camera: 'allow',
    location: 'block',
    microphone: 'ask',
    notifications: 'block',
  };
  
  const mockStoredPermissions = [
    {
      domain: 'existing-site.com',
      permissions: {
        camera: 'block',
        location: 'ask',
        microphone: 'block',
        notifications: 'allow',
      },
      lastUpdated: 1623456789000,
    },
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset initialization state
    // @ts-ignore - Accessing private property for testing
    SiteSpecificPermissions.isInitialized = false;
    
    // Default mock implementation
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockStoredPermissions));
    AsyncStorage.setItem.mockResolvedValue(undefined);
  });

  test('initialize loads permissions from AsyncStorage', async () => {
    // @ts-ignore - Accessing private method for testing
    await SiteSpecificPermissions.initialize();
    
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(SITE_PERMISSIONS_KEY);
    
    // @ts-ignore - Accessing private property for testing
    expect(SiteSpecificPermissions.sitePermissions).toEqual(mockStoredPermissions);
    
    // @ts-ignore - Accessing private property for testing
    expect(SiteSpecificPermissions.isInitialized).toBe(true);
  });

  test('getSitePermissions returns permissions for existing site', async () => {
    const permissions = await SiteSpecificPermissions.getSitePermissions('existing-site.com');
    
    expect(permissions).toEqual(mockStoredPermissions[0].permissions);
  });

  test('getSitePermissions returns null for non-existing site', async () => {
    const permissions = await SiteSpecificPermissions.getSitePermissions('non-existing-site.com');
    
    expect(permissions).toBeNull();
  });

  test('setSitePermissions adds new site permissions', async () => {
    await SiteSpecificPermissions.setSitePermissions(testDomain, testPermissions);
    
    // Check that AsyncStorage.setItem was called with updated permissions
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      SITE_PERMISSIONS_KEY,
      expect.stringContaining(testDomain)
    );
    
    const setItemCall = AsyncStorage.setItem.mock.calls[0][1];
    const savedPermissions = JSON.parse(setItemCall);
    
    // Should contain both the existing and new permissions
    expect(savedPermissions.length).toBe(2);
    expect(savedPermissions[1].domain).toBe(testDomain);
    expect(savedPermissions[1].permissions).toEqual(testPermissions);
  });

  test('setSitePermissions updates existing site permissions', async () => {
    const updatedPermissions = {
      camera: 'allow',
      location: 'allow',
      microphone: 'allow',
      notifications: 'allow',
    };
    
    await SiteSpecificPermissions.setSitePermissions('existing-site.com', updatedPermissions);
    
    const setItemCall = AsyncStorage.setItem.mock.calls[0][1];
    const savedPermissions = JSON.parse(setItemCall);
    
    // Should still have only one entry
    expect(savedPermissions.length).toBe(1);
    expect(savedPermissions[0].domain).toBe('existing-site.com');
    expect(savedPermissions[0].permissions).toEqual(updatedPermissions);
  });

  test('updateSitePermission updates a specific permission', async () => {
    await SiteSpecificPermissions.updateSitePermission('existing-site.com', 'camera', 'allow');
    
    const setItemCall = AsyncStorage.setItem.mock.calls[0][1];
    const savedPermissions = JSON.parse(setItemCall);
    
    expect(savedPermissions[0].permissions.camera).toBe('allow');
    // Other permissions should remain unchanged
    expect(savedPermissions[0].permissions.location).toBe('ask');
  });

  test('removeSitePermissions removes site permissions', async () => {
    await SiteSpecificPermissions.removeSitePermissions('existing-site.com');
    
    const setItemCall = AsyncStorage.setItem.mock.calls[0][1];
    const savedPermissions = JSON.parse(setItemCall);
    
    expect(savedPermissions.length).toBe(0);
  });

  test('getAllSitePermissions returns all site permissions', async () => {
    const allPermissions = await SiteSpecificPermissions.getAllSitePermissions();
    
    expect(allPermissions).toEqual(mockStoredPermissions);
  });

  test('clearAllSitePermissions removes all site permissions', async () => {
    await SiteSpecificPermissions.clearAllSitePermissions();
    
    const setItemCall = AsyncStorage.setItem.mock.calls[0][1];
    const savedPermissions = JSON.parse(setItemCall);
    
    expect(savedPermissions.length).toBe(0);
  });

  test('hasSiteSpecificPermissions returns true for existing site', async () => {
    const hasPermissions = await SiteSpecificPermissions.hasSiteSpecificPermissions('existing-site.com');
    
    expect(hasPermissions).toBe(true);
  });

  test('hasSiteSpecificPermissions returns false for non-existing site', async () => {
    const hasPermissions = await SiteSpecificPermissions.hasSiteSpecificPermissions('non-existing-site.com');
    
    expect(hasPermissions).toBe(false);
  });

  test('initialize handles errors gracefully', async () => {
    // Mock console.error to prevent test output pollution
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    // Force AsyncStorage.getItem to throw an error
    AsyncStorage.getItem.mockRejectedValue(new Error('Test error'));
    
    // @ts-ignore - Accessing private method for testing
    await SiteSpecificPermissions.initialize();
    
    // Should set empty permissions array on error
    // @ts-ignore - Accessing private property for testing
    expect(SiteSpecificPermissions.sitePermissions).toEqual([]);
    
    // Restore console.error
    console.error = originalConsoleError;
  });
});