import { create } from 'zustand';
import { Platform } from 'react-native';
import { StorageManager, HistoryItem, BookmarkItem } from '../utils/storage';
import SearchIndexManager from '../utils/searchIndex';
import DownloadManager from '../utils/downloadManager';
import { AdvancedBrowserSettings, BrowserSettings } from '../types/settings';
import { SimpleTab, TabsViewMode } from '../types/simpleTabs';
import { logger } from '../utils/logger';
import {
  AdBlockerState,
  AdBlockStats,
  WhitelistItem,
  WhitelistValidationResult,
  FakeLocationConfig,
  PrivacyFeatures,
  DEFAULT_ADBLOCKER_STATE,
  DEFAULT_FAKE_LOCATION,
  ADBLOCKER_STORAGE_KEYS,
  ADBLOCKER_DEBOUNCE_TIMES,
} from '../types/adBlocker';

// Storage keys
const TABS_STORAGE_KEY = '@browser_tabs';
const ACTIVE_TAB_ID_KEY = '@browser_active_tab_id';

// ============================================================================
// ADBLOCKER UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract clean domain from URL (handles www, subdomains, protocols, paths)
 * @param url - Full URL or domain string
 * @returns Normalized domain (e.g., "google.com") or empty string if invalid
 */
function extractDomain(url: string): string {
  if (!url || typeof url !== 'string') return '';
  
  try {
    // Remove whitespace
    let cleanUrl = url.trim().toLowerCase();
    
    // If no protocol, add https for URL parsing
    if (!cleanUrl.includes('://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    
    const urlObj = new URL(cleanUrl);
    let hostname = urlObj.hostname;
    
    // Remove www. prefix
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    return hostname;
  } catch {
    // Try to extract domain-like pattern from invalid URLs
    const domainPattern = /^(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)/i;
    const match = url.match(domainPattern);
    return match ? match[1].toLowerCase() : '';
  }
}

/**
 * Check if two domains are the same (for counter reset logic)
 * Handles subdomains: m.google.com and www.google.com are considered same
 */
function isSameDomain(domain1: string, domain2: string): boolean {
  if (!domain1 || !domain2) return false;
  
  const d1 = extractDomain(domain1);
  const d2 = extractDomain(domain2);
  
  if (d1 === d2) return true;
  
  // Check for subdomain matches (e.g., m.google.com vs google.com)
  const parts1 = d1.split('.');
  const parts2 = d2.split('.');
  
  // Get base domains (last 2 parts for most TLDs)
  const base1 = parts1.slice(-2).join('.');
  const base2 = parts2.slice(-2).join('.');
  
  return base1 === base2;
}

/**
 * Validate and normalize domain for whitelist
 */
function validateWhitelistDomain(domain: string, existingWhitelist: WhitelistItem[]): WhitelistValidationResult {
  if (!domain || typeof domain !== 'string') {
    return {
      isValid: false,
      errorMessage: 'Please enter a domain',
      errorType: 'empty',
    };
  }
  
  const trimmed = domain.trim();
  
  if (trimmed.length === 0) {
    return {
      isValid: false,
      errorMessage: 'Please enter a domain',
      errorType: 'empty',
    };
  }
  
  if (trimmed.length > 255) {
    return {
      isValid: false,
      errorMessage: 'Domain is too long (max 255 characters)',
      errorType: 'too_long',
    };
  }
  
  const normalizedDomain = extractDomain(trimmed);
  
  if (!normalizedDomain || normalizedDomain.length < 3 || !normalizedDomain.includes('.')) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid domain (e.g., example.com)',
      errorType: 'invalid_format',
    };
  }
  
  // Check for duplicates
  const isDuplicate = existingWhitelist.some(
    item => item.domain.toLowerCase() === normalizedDomain.toLowerCase()
  );
  
  if (isDuplicate) {
    return {
      isValid: false,
      errorMessage: 'This domain is already in your whitelist',
      errorType: 'duplicate',
    };
  }
  
  return {
    isValid: true,
    normalizedDomain,
  };
}

/**
 * Generate unique ID for whitelist items
 */
function generateWhitelistId(): string {
  return `wl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Debounce timers for AsyncStorage saves
let saveStatsTimer: ReturnType<typeof setTimeout> | null = null;
let saveWhitelistTimer: ReturnType<typeof setTimeout> | null = null;
let saveFeaturesTimer: ReturnType<typeof setTimeout> | null = null;

interface RateLimitInfo {
  domain: string;
  errorCount: number;
  lastErrorTime: number;
  cooldownUntil: number;
}

interface BrowserState {
  // Settings
  settings: AdvancedBrowserSettings;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AdvancedBrowserSettings>(key: K, value: AdvancedBrowserSettings[K]) => Promise<void>;
  
  // Rate Limiting
  rateLimits: Record<string, RateLimitInfo>;
  recordRateLimitError: (domain: string, cooldownMs: number) => void;
  clearRateLimit: (domain: string) => void;
  getRateLimitInfo: (domain: string) => RateLimitInfo | undefined;
  
  // Ad blocking
  isAdBlockEnabled: boolean;
  toggleAdBlock: () => Promise<void>;
  
  // ============================================================================
  // ADVANCED ADBLOCKER STATE
  // ============================================================================
  
  // AdBlocker state (complete state object)
  adBlocker: AdBlockerState;
  
  // Privacy feature toggles
  toggleTrackingProtection: () => Promise<void>;
  toggleLocationPrivacy: () => Promise<void>;
  
  // Statistics management
  incrementAdsBlocked: (count?: number) => void;
  incrementTrackersBlocked: (count?: number) => void;
  updateFromWebViewStats: (stats: { adsBlocked?: number; trackersBlocked?: number; totalBlocked?: number; timestamp?: string }) => void;
  resetCurrentPageStats: () => void;
  updateCurrentDomain: (newUrl: string) => void;
  clearAllAdBlockStats: () => Promise<void>;
  
  // Whitelist management
  addToWhitelist: (domain: string) => Promise<WhitelistValidationResult>;
  removeFromWhitelist: (id: string) => Promise<void>;
  clearWhitelist: () => Promise<void>;
  isWhitelisted: (url: string) => boolean;
  
  // Fake location management
  setFakeLocation: (config: FakeLocationConfig) => Promise<void>;
  setRandomLocation: (enabled: boolean) => Promise<void>;
  
  // AdBlocker persistence
  loadAdBlockerData: () => Promise<void>;
  saveAdBlockerStats: () => void;
  saveAdBlockerWhitelist: () => void;
  saveAdBlockerFeatures: () => void;
  
  // ============================================================================
  
  // Tab management (Normal tabs - persisted)
  tabs: SimpleTab[];
  activeTabId: string | null;
  pendingUrlForActiveTab: string | null;
  createNewTab: (url?: string) => string;
  addTab: (tab: Partial<SimpleTab> & { url: string }) => string;
  switchToTab: (tabId: string, forceReload?: boolean) => void;
  setActiveTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  updateTabUrl: (tabId: string, url: string) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  updateTabScreenshot: (tabId: string, screenshot: string) => void;
  updatePrivacyTabScreenshot: (tabId: string, screenshot: string) => void;
  loadTabs: () => Promise<void>;
  saveTabs: () => Promise<void>;
  getActiveTab: () => SimpleTab | null;
  getAllTabs: () => SimpleTab[];
  getTabsCount: () => number;
  closeAllNormalTabs: () => void;
  setPendingUrlForActiveTab: (url: string | null) => void;
  getPendingUrlForActiveTab: () => string | null;
  clearPendingUrlForActiveTab: () => void;
  
  // Privacy tabs (memory only - never persisted)
  privacyTabs: SimpleTab[];
  activePrivacyTabId: string | null;
  tabsViewMode: TabsViewMode;
  createPrivacyTab: (url?: string) => string;
  switchToPrivacyTab: (tabId: string, forceReload?: boolean) => void;
  closePrivacyTab: (tabId: string) => void;
  updatePrivacyTabUrl: (tabId: string, url: string) => void; // NEW: Update privacy tab URL
  updatePrivacyTabTitle: (tabId: string, title: string) => void; // NEW: Update privacy tab title
  closeAllPrivacyTabs: () => void;
  setTabsViewMode: (mode: TabsViewMode) => void;
  getPrivacyTabsCount: () => number;
  getActivePrivacyTab: () => SimpleTab | null;
  
  // Theme and appearance
  darkMode: boolean; // Alias for settings.darkMode
  
  // Night mode
  nightMode: boolean;
  toggleNightMode: () => Promise<void>;
  
  // Desktop mode
  desktopMode: boolean;
  toggleDesktopMode: () => Promise<void>;
  
  // Incognito mode
  incognitoMode: boolean;
  toggleIncognitoMode: () => Promise<void>;
  
  // History management
  history: HistoryItem[];
  loadHistory: () => Promise<void>;
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'visitCount'>) => Promise<void>;
  clearHistory: () => Promise<void>;
  searchHistory: (query: string) => Promise<HistoryItem[]>;
  removeHistoryItem: (id: string) => Promise<void>;
  
  // Bookmarks management
  bookmarks: BookmarkItem[];
  loadBookmarks: () => Promise<void>;
  addBookmark: (item: Omit<BookmarkItem, 'id' | 'dateAdded'>) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  updateBookmark: (id: string, updates: Partial<BookmarkItem>) => Promise<void>;
  searchBookmarks: (query: string) => Promise<BookmarkItem[]>;
  
  // Search functionality
  initializeSearch: () => Promise<void>;
  performSearch: (query: string, options?: Record<string, unknown>) => Promise<unknown[]>;
  
  // Downloads
  initializeDownloads: () => Promise<void>;
  
  // Initialization
  initialize: () => Promise<void>;
}

// Function to generate page title from URL
function generateSimpleTitle(url: string): string {
  if (!url || url === 'about:blank') return 'New Page';
  if (url === 'https://www.google.com') return 'Google';
  
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '') || 'New Page';
  } catch {
    return 'New Page';
  }
}

// Function to resolve URL
function resolveUrl(url: string): string {
  // Get the store instance to access settings
  const store = useBrowserStore.getState();
  const searchEngine = store.settings.searchEngine || 'google';
  
  // Map search engines to their base URLs
  const engineHomepages: {[key: string]: string} = {
    google: 'https://www.google.com',
    bing: 'https://www.bing.com',
    duckduckgo: 'https://duckduckgo.com',
    yahoo: 'https://www.yahoo.com',
    ecosia: 'https://www.ecosia.org',
  };
  
  // Get default homepage based on selected search engine
  const defaultHomepage = engineHomepages[searchEngine] || 'https://www.google.com';
  
  // Handle empty URL or about:blank
  if (!url || url.trim() === '' || url === 'about:blank') return defaultHomepage;
  
  // If URL contains a protocol
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it looks like a URL
  if (url.includes('.') && !url.includes(' ')) {
    return `https://${url}`;
  }
  
  // Otherwise treat it as a search query using the selected search engine
  const defaultEngines = {
    google: `https://www.google.com/search?q=${encodeURIComponent(url)}`,
    bing: `https://www.bing.com/search?q=${encodeURIComponent(url)}`,
    duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(url)}`,
    yahoo: `https://search.yahoo.com/search?p=${encodeURIComponent(url)}`,
    ecosia: `https://www.ecosia.org/search?q=${encodeURIComponent(url)}`,
  };
  
  // Check if it's a custom search engine URL
  if (searchEngine.includes('{searchTerms}')) {
    return searchEngine.replace('{searchTerms}', encodeURIComponent(url));
  } else if (searchEngine.includes('%s')) {
    return searchEngine.replace('%s', encodeURIComponent(url));
  } else if (defaultEngines[searchEngine as keyof typeof defaultEngines]) {
    return defaultEngines[searchEngine as keyof typeof defaultEngines];
  } else {
    // Fallback to Google
    return defaultEngines.google;
  }
}

export const useBrowserStore = create<BrowserState>((set, get) => ({
  // Settings state
  settings: {
    nightMode: false,
    incognitoMode: false,
    desktopMode: false,
    adBlockEnabled: true,
    searchEngine: 'google',
    homepage: 'https://www.google.com',
    autoSaveHistory: true,
    maxHistoryItems: 1000,
    rateLimitEnabled: true,
    maxRequestsPerMinute: 60,
    rateLimitCooldown: 30000,
    customSearchEngine: '',
    passwordManager: {
      savePasswords: true,
      autoSignIn: true,
      biometricAuth: false,
    },
    paymentMethods: {
      saveAndFill: true,
    },
    addresses: {
      saveAndFill: true,
    },
    notifications: {
      permissionRequests: true,
      downloadComplete: true,
      securityAlerts: true,
    },
    privacy: {
      safeBrowsing: 'standard',
      httpsFirst: true,
      paymentMethodDetection: true,
      preloadPages: true,
      secureDNS: 'automatic',
      doNotTrack: false,
      privacySandbox: false,
    },
    appearance: {
      theme: 'system',
      fontSize: 14,
      pageZoom: 100,
      toolbarLayout: 'default',
    },
    accessibility: {
      textToSpeech: false,
      screenReaderSupport: false,
      navigationAssistance: false,
      textSize: 1.0,
      highContrastMode: false,
      reduceMotion: false,
      touchAssistance: false,
      screenReaderOptimized: false,
    },
    sitePermissions: {
      camera: 'ask',
      location: 'ask',
      microphone: 'ask',
      notifications: 'ask',
    },
    language: {
      preferredLanguage: 'en',
      translationEnabled: true,
    },
    downloads: {
      storageLocation: 'internal',
      wifiOnlyDownloads: false,
      askDownloadLocation: true,
    },
    darkMode: false,
  },
  
  // Rate Limiting state
  rateLimits: {},

  recordRateLimitError: (domain: string, cooldownMs: number) => {
    const { rateLimits } = get();
    const current = rateLimits[domain] || {
      domain,
      errorCount: 0,
      lastErrorTime: 0,
      cooldownUntil: 0,
    };

    const now = Date.now();
    const newErrorCount = current.errorCount + 1;
    
    // Exponential backoff: base cooldown * 2 ^ (errorCount - 1)
    const exponentialCooldown = cooldownMs * Math.pow(2, newErrorCount - 1);
    
    set({
      rateLimits: {
        ...rateLimits,
        [domain]: {
          domain,
          errorCount: newErrorCount,
          lastErrorTime: now,
          cooldownUntil: now + exponentialCooldown,
        },
      },
    });
    
    logger.warn(`Rate limit error recorded for ${domain}`, {
      errorCount: newErrorCount,
      cooldownUntil: new Date(now + exponentialCooldown).toISOString(),
    });
  },

  clearRateLimit: (domain: string) => {
    const { rateLimits } = get();
    if (!rateLimits[domain]) return;

    const newRateLimits = { ...rateLimits };
    delete newRateLimits[domain];
    set({ rateLimits: newRateLimits });
  },

  getRateLimitInfo: (domain: string) => {
    return get().rateLimits[domain];
  },

  loadSettings: async () => {
    try {
      const basicSettings = await StorageManager.getSettings();
      const advancedSettings = await StorageManager.getItem<AdvancedBrowserSettings>('advanced_settings', get().settings);
      
      // Merge basic settings with advanced settings
      const settings = { ...advancedSettings, ...basicSettings };
      
      set({ 
        settings,
        nightMode: settings.nightMode || false,
        incognitoMode: settings.incognitoMode || false,
        desktopMode: settings.desktopMode || false,
        isAdBlockEnabled: settings.adBlockEnabled !== undefined ? settings.adBlockEnabled : true,
      });
    } catch (error) {
      logger.error('Failed to load settings', error);
      // Reset to default values on error
      set({
        nightMode: false,
        incognitoMode: false,
        desktopMode: false,
        isAdBlockEnabled: true,
      });
    }
  },
  
  updateSetting: async (key, value) => {
    try {
      const currentSettings = get().settings;
      const newSettings = { ...currentSettings, [key]: value };
      
      // Update basic settings in old format for compatibility
      if (['nightMode', 'incognitoMode', 'desktopMode', 'adBlockEnabled', 'searchEngine', 'homepage', 'autoSaveHistory', 'maxHistoryItems'].includes(key as string)) {
        await StorageManager.updateSettings({ [key]: value });
      }
      
      // Update advanced settings
      await StorageManager.setItem('advanced_settings', newSettings);
      
      set({ settings: newSettings });
      
      // Update corresponding state variables
      if (key === 'nightMode') set({ nightMode: value as boolean });
      if (key === 'incognitoMode') set({ incognitoMode: value as boolean });
      if (key === 'desktopMode') set({ desktopMode: value as boolean });
      if (key === 'adBlockEnabled') set({ isAdBlockEnabled: value as boolean });
    } catch (error) {
      logger.error('Failed to update setting', error, { key, value });
    }
  },
  
  // Ad blocking state
  isAdBlockEnabled: true,
  toggleAdBlock: async () => {
    const newValue = !get().isAdBlockEnabled;
    // Also update the adBlocker.features.adBlocking
    set(state => ({
      adBlocker: {
        ...state.adBlocker,
        features: {
          ...state.adBlocker.features,
          adBlocking: newValue,
        },
      },
    }));
    get().saveAdBlockerFeatures();
    await get().updateSetting('adBlockEnabled', newValue);
  },
  
  // ============================================================================
  // ADVANCED ADBLOCKER IMPLEMENTATION
  // ============================================================================
  
  // Complete AdBlocker state
  adBlocker: { ...DEFAULT_ADBLOCKER_STATE },
  
  // Toggle tracking protection
  toggleTrackingProtection: async () => {
    const newValue = !get().adBlocker.features.trackingProtection;
    set(state => ({
      adBlocker: {
        ...state.adBlocker,
        features: {
          ...state.adBlocker.features,
          trackingProtection: newValue,
        },
      },
    }));
    get().saveAdBlockerFeatures();
  },
  
  // Toggle location privacy
  toggleLocationPrivacy: async () => {
    const newValue = !get().adBlocker.features.locationPrivacy;
    set(state => ({
      adBlocker: {
        ...state.adBlocker,
        features: {
          ...state.adBlocker.features,
          locationPrivacy: newValue,
        },
      },
    }));
    get().saveAdBlockerFeatures();
  },
  
  // Increment ads blocked counter
  incrementAdsBlocked: (count: number = 1) => {
    set(state => ({
      adBlocker: {
        ...state.adBlocker,
        stats: {
          ...state.adBlocker.stats,
          currentPage: {
            ...state.adBlocker.stats.currentPage,
            adsBlocked: state.adBlocker.stats.currentPage.adsBlocked + count,
          },
          lifetime: {
            ...state.adBlocker.stats.lifetime,
            totalAdsBlocked: state.adBlocker.stats.lifetime.totalAdsBlocked + count,
            lastUpdated: new Date().toISOString(),
          },
        },
      },
    }));
    get().saveAdBlockerStats();
  },
  
  // Increment trackers blocked counter
  incrementTrackersBlocked: (count: number = 1) => {
    set(state => ({
      adBlocker: {
        ...state.adBlocker,
        stats: {
          ...state.adBlocker.stats,
          currentPage: {
            ...state.adBlocker.stats.currentPage,
            trackersBlocked: state.adBlocker.stats.currentPage.trackersBlocked + count,
          },
          lifetime: {
            ...state.adBlocker.stats.lifetime,
            totalTrackersBlocked: state.adBlocker.stats.lifetime.totalTrackersBlocked + count,
            lastUpdated: new Date().toISOString(),
          },
        },
      },
    }));
    get().saveAdBlockerStats();
  },

  // Update stats from WebView (update current page view only)
  updateFromWebViewStats: (stats: { adsBlocked?: number; trackersBlocked?: number; totalBlocked?: number; timestamp?: string }) => {
    set(state => ({
      adBlocker: {
        ...state.adBlocker,
        stats: {
          ...state.adBlocker.stats,
          currentPage: {
            ...state.adBlocker.stats.currentPage,
            adsBlocked: stats.adsBlocked !== undefined ? stats.adsBlocked : state.adBlocker.stats.currentPage.adsBlocked,
            trackersBlocked: stats.trackersBlocked !== undefined ? stats.trackersBlocked : state.adBlocker.stats.currentPage.trackersBlocked,
          },
          // Do NOT update lifetime stats here directly - they are updated via increment actions
          lifetime: {
            ...state.adBlocker.stats.lifetime,
            lastUpdated: stats.timestamp || new Date().toISOString(),
          },
        },
      },
    }));
  },
  
  // Reset current page stats (called on domain change)
  resetCurrentPageStats: () => {
    set(state => ({
      adBlocker: {
        ...state.adBlocker,
        stats: {
          ...state.adBlocker.stats,
          currentPage: {
            adsBlocked: 0,
            trackersBlocked: 0,
            currentDomain: state.adBlocker.stats.currentPage.currentDomain,
          },
        },
      },
    }));
  },
  
  // Update current domain and reset stats if domain changed
  updateCurrentDomain: (newUrl: string) => {
    const currentDomain = get().adBlocker.stats.currentPage.currentDomain;
    const newDomain = extractDomain(newUrl);
    
    // Only reset if domain actually changed (not same domain navigation)
    if (!isSameDomain(currentDomain, newDomain)) {
      set(state => ({
        adBlocker: {
          ...state.adBlocker,
          stats: {
            ...state.adBlocker.stats,
            currentPage: {
              adsBlocked: 0,
              trackersBlocked: 0,
              currentDomain: newDomain,
            },
          },
        },
      }));
    } else {
      // Just update the domain without resetting counters
      set(state => ({
        adBlocker: {
          ...state.adBlocker,
          stats: {
            ...state.adBlocker.stats,
            currentPage: {
              ...state.adBlocker.stats.currentPage,
              currentDomain: newDomain,
            },
          },
        },
      }));
    }
  },
  
  // Clear all statistics (with confirmation in UI)
  clearAllAdBlockStats: async () => {
    set(state => ({
      adBlocker: {
        ...state.adBlocker,
        stats: {
          currentPage: {
            adsBlocked: 0,
            trackersBlocked: 0,
            currentDomain: '',
          },
          lifetime: {
            totalAdsBlocked: 0,
            totalTrackersBlocked: 0,
            lastUpdated: new Date().toISOString(),
          },
        },
      },
    }));
    
    // Save immediately (not debounced) for clear action
    try {
      await StorageManager.setItem(ADBLOCKER_STORAGE_KEYS.STATS, {
        totalAdsBlocked: 0,
        totalTrackersBlocked: 0,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to clear AdBlocker stats', error);
    }
  },
  
  // Add domain to whitelist
  addToWhitelist: async (domain: string): Promise<WhitelistValidationResult> => {
    const validation = validateWhitelistDomain(domain, get().adBlocker.whitelist);
    
    if (!validation.isValid) {
      return validation;
    }
    
    const newItem: WhitelistItem = {
      id: generateWhitelistId(),
      domain: validation.normalizedDomain!,
      addedAt: new Date().toISOString(),
      includeSubdomains: true,
    };
    
    set(state => ({
      adBlocker: {
        ...state.adBlocker,
        whitelist: [...state.adBlocker.whitelist, newItem],
      },
    }));
    
    get().saveAdBlockerWhitelist();
    return validation;
  },
  
  // Remove domain from whitelist
  removeFromWhitelist: async (id: string) => {
    set(state => ({
      adBlocker: {
        ...state.adBlocker,
        whitelist: state.adBlocker.whitelist.filter(item => item.id !== id),
      },
    }));
    get().saveAdBlockerWhitelist();
  },
  
  // Clear entire whitelist
  clearWhitelist: async () => {
    set(state => ({
      adBlocker: {
        ...state.adBlocker,
        whitelist: [],
      },
    }));
    
    // Save immediately for clear action
    try {
      await StorageManager.setItem(ADBLOCKER_STORAGE_KEYS.WHITELIST, []);
    } catch (error) {
      logger.error('Failed to clear whitelist', error);
    }
  },
  
  // Check if URL is whitelisted
  isWhitelisted: (url: string): boolean => {
    const domain = extractDomain(url);
    if (!domain) return false;
    
    const whitelist = get().adBlocker.whitelist;
    
    return whitelist.some(item => {
      if (item.includeSubdomains) {
        // Check if domain matches or is a subdomain
        return domain === item.domain || domain.endsWith('.' + item.domain);
      }
      return domain === item.domain;
    });
  },
  
  // Set fake location configuration
  setFakeLocation: async (config: FakeLocationConfig) => {
    set(state => ({
      adBlocker: {
        ...state.adBlocker,
        fakeLocation: config,
      },
    }));
    
    try {
      await StorageManager.setItem(ADBLOCKER_STORAGE_KEYS.FAKE_LOCATION, config);
    } catch (error) {
      logger.error('Failed to save fake location', error);
    }
  },
  
  // Enable/disable random location
  setRandomLocation: async (enabled: boolean) => {
    set(state => ({
      adBlocker: {
        ...state.adBlocker,
        useRandomLocation: enabled,
      },
    }));
    get().saveAdBlockerFeatures();
  },
  
  // Load all AdBlocker data from AsyncStorage
  loadAdBlockerData: async () => {
    try {
      // Load stats
      const savedStats = await StorageManager.getItem<{
        totalAdsBlocked: number;
        totalTrackersBlocked: number;
        lastUpdated: string;
      } | null>(ADBLOCKER_STORAGE_KEYS.STATS, null as unknown as { totalAdsBlocked: number; totalTrackersBlocked: number; lastUpdated: string; } | null);
      
      // Load whitelist
      const savedWhitelist = await StorageManager.getItem<WhitelistItem[]>(
        ADBLOCKER_STORAGE_KEYS.WHITELIST,
        []
      );
      
      // Load features
      const savedFeatures = await StorageManager.getItem<{
        trackingProtection: boolean;
        locationPrivacy: boolean;
        useRandomLocation: boolean;
      } | null>(ADBLOCKER_STORAGE_KEYS.FEATURES, null as unknown as { trackingProtection: boolean; locationPrivacy: boolean; useRandomLocation: boolean; } | null);
      
      // Load fake location
      const savedFakeLocation = await StorageManager.getItem<FakeLocationConfig>(
        ADBLOCKER_STORAGE_KEYS.FAKE_LOCATION,
        DEFAULT_FAKE_LOCATION
      );
      
      // Update state with loaded data
      set(state => ({
        adBlocker: {
          ...state.adBlocker,
          stats: {
            currentPage: {
              adsBlocked: 0,
              trackersBlocked: 0,
              currentDomain: '',
            },
            lifetime: savedStats ? {
              totalAdsBlocked: savedStats.totalAdsBlocked || 0,
              totalTrackersBlocked: savedStats.totalTrackersBlocked || 0,
              lastUpdated: savedStats.lastUpdated || new Date().toISOString(),
            } : DEFAULT_ADBLOCKER_STATE.stats.lifetime,
          },
          whitelist: Array.isArray(savedWhitelist) ? savedWhitelist : [],
          features: {
            adBlocking: state.isAdBlockEnabled,
            trackingProtection: savedFeatures?.trackingProtection ?? true,
            locationPrivacy: savedFeatures?.locationPrivacy ?? false,
          },
          fakeLocation: savedFakeLocation || DEFAULT_FAKE_LOCATION,
          useRandomLocation: savedFeatures?.useRandomLocation ?? false,
        },
      }));
    } catch (error) {
      logger.error('Failed to load AdBlocker data', error);
      // Keep default state on error
    }
  },
  
  // Save stats with debounce
  saveAdBlockerStats: () => {
    if (saveStatsTimer) {
      clearTimeout(saveStatsTimer);
    }
    
    saveStatsTimer = setTimeout(async () => {
      try {
        const stats = get().adBlocker.stats.lifetime;
        await StorageManager.setItem(ADBLOCKER_STORAGE_KEYS.STATS, {
          totalAdsBlocked: stats.totalAdsBlocked,
          totalTrackersBlocked: stats.totalTrackersBlocked,
          lastUpdated: stats.lastUpdated,
        });
      } catch (error) {
        logger.error('Failed to save AdBlocker stats', error);
      }
    }, ADBLOCKER_DEBOUNCE_TIMES.SAVE_STATS);
  },
  
  // Save whitelist with debounce
  saveAdBlockerWhitelist: () => {
    if (saveWhitelistTimer) {
      clearTimeout(saveWhitelistTimer);
    }
    
    saveWhitelistTimer = setTimeout(async () => {
      try {
        const whitelist = get().adBlocker.whitelist;
        await StorageManager.setItem(ADBLOCKER_STORAGE_KEYS.WHITELIST, whitelist);
      } catch (error) {
        logger.error('Failed to save whitelist', error);
      }
    }, ADBLOCKER_DEBOUNCE_TIMES.SAVE_WHITELIST);
  },
  
  // Save features with debounce
  saveAdBlockerFeatures: () => {
    if (saveFeaturesTimer) {
      clearTimeout(saveFeaturesTimer);
    }
    
    saveFeaturesTimer = setTimeout(async () => {
      try {
        const { features, useRandomLocation } = get().adBlocker;
        await StorageManager.setItem(ADBLOCKER_STORAGE_KEYS.FEATURES, {
          trackingProtection: features.trackingProtection,
          locationPrivacy: features.locationPrivacy,
          useRandomLocation,
        });
      } catch (error) {
        logger.error('Failed to save AdBlocker features', error);
      }
    }, ADBLOCKER_DEBOUNCE_TIMES.SAVE_FEATURES);
  },
  
  // Tab management state
  tabs: [],
  activeTabId: null,
  pendingUrlForActiveTab: null,

  createNewTab: (url?: string) => {
    // Get default homepage URL based on selected search engine if no URL is provided
    if (!url) {
      const searchEngine = get().settings.searchEngine || 'google';
      const engineHomepages: {[key: string]: string} = {
        google: 'https://www.google.com',
        bing: 'https://www.bing.com',
        duckduckgo: 'https://duckduckgo.com',
        yahoo: 'https://www.yahoo.com',
        ecosia: 'https://www.ecosia.org',
      };
      
      url = engineHomepages[searchEngine] || 'https://www.google.com';
      
      // Handle custom search engine - extract the base URL
      if (!engineHomepages[searchEngine] && searchEngine.includes('://')) {
        try {
          const urlObj = new URL(searchEngine.split('{searchTerms}')[0].split('%s')[0]);
          url = urlObj.origin;
        } catch (error) {
          logger.error('Error parsing custom search engine URL', error, { searchEngine });
          url = 'https://www.google.com';
        }
      }
    }
    
    const resolvedUrl = resolveUrl(url);
    const newTab: SimpleTab = {
      id: Date.now().toString(),
      url: resolvedUrl,
      title: generateSimpleTitle(resolvedUrl),
      isActive: true,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    };
    
    set(state => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id
    }));
    
    get().saveTabs();
    return newTab.id;
  },

  // Alias for createNewTab with extended options
  addTab: (tab: Partial<SimpleTab> & { url: string }) => {
    const resolvedUrl = resolveUrl(tab.url);
    const newTab: SimpleTab = {
      id: tab.id || Date.now().toString(),
      url: resolvedUrl,
      title: tab.title || generateSimpleTitle(resolvedUrl),
      isActive: true,
      createdAt: tab.createdAt || Date.now(),
      lastAccessed: tab.lastAccessed || Date.now(),
    };
    
    set(state => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id
    }));
    
    get().saveTabs();
    return newTab.id;
  },
  
  switchToTab: (tabId: string, forceReload = false) => {
    const { activeTabId: currentActiveTabId, tabs } = get();
    const tab = tabs.find(t => t.id === tabId);
    
    if (forceReload && tab && currentActiveTabId === tabId) {
      set({ activeTabId: tabId, pendingUrlForActiveTab: tab.url });
    } else {
      set({ activeTabId: tabId, pendingUrlForActiveTab: null });
    }
    StorageManager.setItem(ACTIVE_TAB_ID_KEY, tabId);
  },

  // Alias for switchToTab
  setActiveTab: (tabId: string) => {
    get().switchToTab(tabId);
  },
  
  closeTab: (tabId: string) => {
    const { tabs, activeTabId } = get();
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    
    // If we're closing the active tab, switch to another tab
    let newActiveTabId = activeTabId;
    if (activeTabId === tabId) {
      newActiveTabId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
    }
    
    set({ tabs: newTabs, activeTabId: newActiveTabId });
    get().saveTabs();
    
    // If no tabs left, create a new one
    if (newTabs.length === 0) {
      get().createNewTab();
    }
  },
  
  updateTabUrl: (tabId: string, url: string) => {
    const { tabs } = get();
    const newTabs = tabs.map(tab => {
      if (tab.id === tabId) {
        return { ...tab, url };
      }
      return tab;
    });
    
    set({ tabs: newTabs });
    get().saveTabs();
  },
  
  updateTabTitle: (tabId: string, title: string) => {
    const { tabs } = get();
    const newTabs = tabs.map(tab => {
      if (tab.id === tabId) {
        return { ...tab, title };
      }
      return tab;
    });
    
    set({ tabs: newTabs });
    get().saveTabs();
  },
  
  // Update tab screenshot
  updateTabScreenshot: (tabId: string, screenshot: string) => {
    // Safety check for size (e.g., limit to ~5MB for Android, 300KB for iOS)
    const MAX_SCREENSHOT_SIZE = Platform.OS === 'ios' 
      ? 300 * 1024     // 300KB for iOS
      : 5 * 1024 * 1024; // 5MB for Android

    if (screenshot && screenshot.length > MAX_SCREENSHOT_SIZE) {
      logger.warn('Screenshot too large, skipping update', { tabId, length: screenshot.length });
      return;
    }

    const { tabs } = get();
    const newTabs = tabs.map(tab => {
      if (tab.id === tabId) {
        return { ...tab, screenshot };
      }
      return tab;
    });
    
    set({ tabs: newTabs });
    get().saveTabs();
  },
  
  // Update privacy tab screenshot
  updatePrivacyTabScreenshot: (tabId: string, screenshot: string) => {
    const { privacyTabs } = get();
    const newTabs = privacyTabs.map(tab => {
      if (tab.id === tabId) {
        return { ...tab, screenshot };
      }
      return tab;
    });
    
    set({ privacyTabs: newTabs });
    // Privacy tabs are NOT persisted
  },
  
  loadTabs: async () => {
    try {
      // Handle both array and string data to fix legacy storage issues
      const raw = await StorageManager.getItem<SimpleTab[] | string>(TABS_STORAGE_KEY, []);
      let tabs: SimpleTab[] = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : []);
      const activeTabId = await StorageManager.getItem<string | null>(ACTIVE_TAB_ID_KEY, null);
      
      if (tabs.length > 0) {
        // Find if there is already a home tab
        const homeTab = tabs.find(t => !t.url || t.url === 'about:blank');
        
        if (homeTab) {
          // Make the existing home tab active
          const updatedTabs = tabs.map(t => ({
            ...t,
            isActive: t.id === homeTab.id
          }));
          set({ tabs: updatedTabs, activeTabId: homeTab.id });
        } else {
          // Create a new home tab and set it as active on startup
          const newHomeTab: SimpleTab = {
            id: Date.now().toString(),
            url: '',
            title: 'Home',
            isActive: true,
            createdAt: Date.now(),
            lastAccessed: Date.now(),
          };
          const updatedTabs = tabs.map(t => ({ ...t, isActive: false }));
          set({ tabs: [...updatedTabs, newHomeTab], activeTabId: newHomeTab.id });
          await get().saveTabs();
        }
        
        // Normalize storage format if we parsed from string
        if (typeof raw === 'string') {
          await StorageManager.setItem(TABS_STORAGE_KEY, tabs);
        }
      } else {
        // Initialize with a default tab using the selected search engine
        const searchEngine = get().settings.searchEngine || 'google';
        const engineHomepages: {[key: string]: string} = {
          google: 'https://www.google.com',
          bing: 'https://www.bing.com',
          duckduckgo: 'https://duckduckgo.com',
          yahoo: 'https://www.yahoo.com',
          ecosia: 'https://www.ecosia.org',
        };
        
        let defaultUrl = engineHomepages[searchEngine] || 'https://www.google.com';
        let defaultTitle = searchEngine === 'google' ? 'Google' : 
                          searchEngine === 'bing' ? 'Bing' : 
                          searchEngine === 'duckduckgo' ? 'DuckDuckGo' : 
                          searchEngine === 'yahoo' ? 'Yahoo' : 
                          searchEngine === 'ecosia' ? 'Ecosia' : 'New Tab';
        
        // Handle custom search engine - extract the base URL
        if (!engineHomepages[searchEngine] && searchEngine.includes('://')) {
          try {
            const urlObj = new URL(searchEngine.split('{searchTerms}')[0].split('%s')[0]);
            defaultUrl = urlObj.origin;
            defaultTitle = urlObj.hostname.replace('www.', '');
          } catch (error) {
            logger.error('Error parsing custom search engine URL', error, { searchEngine });
          }
        }
        
        const defaultTab: SimpleTab = {
          id: Date.now().toString(),
          url: '',
          title: 'Home',
          isActive: true,
          createdAt: Date.now(),
          lastAccessed: Date.now(),
        };
        
        set({ tabs: [defaultTab], activeTabId: defaultTab.id });
        await get().saveTabs();
      }
    } catch (error) {
      logger.error('Failed to load tabs', error);
      // Initialize with a default tab on error using the selected search engine
      const searchEngine = get().settings.searchEngine || 'google';
      const engineHomepages: {[key: string]: string} = {
        google: 'https://www.google.com',
        bing: 'https://www.bing.com',
        duckduckgo: 'https://duckduckgo.com',
        yahoo: 'https://www.yahoo.com',
        ecosia: 'https://www.ecosia.org',
      };
      
      let defaultUrl = engineHomepages[searchEngine] || 'https://www.google.com';
      let defaultTitle = searchEngine === 'google' ? 'Google' : 
                        searchEngine === 'bing' ? 'Bing' : 
                        searchEngine === 'duckduckgo' ? 'DuckDuckGo' : 
                        searchEngine === 'yahoo' ? 'Yahoo' : 
                        searchEngine === 'ecosia' ? 'Ecosia' : 'New Tab';
      
      // Handle custom search engine - extract the base URL
      if (!engineHomepages[searchEngine] && searchEngine.includes('://')) {
        try {
          const urlObj = new URL(searchEngine.split('{searchTerms}')[0].split('%s')[0]);
          defaultUrl = urlObj.origin;
          defaultTitle = urlObj.hostname.replace('www.', '');
        } catch (error) {
          logger.error('Error parsing custom search engine URL', error, { searchEngine });
        }
      }
      
      const defaultTab: SimpleTab = {
        id: Date.now().toString(),
        url: '',
        title: 'Home',
        isActive: true,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
      };
      
      set({ tabs: [defaultTab], activeTabId: defaultTab.id });
    }
  },
  
  saveTabs: async () => {
    try {
      const { tabs, activeTabId } = get();
      // StorageManager handles JSON serialization automatically - don't double-encode
      await StorageManager.setItem<SimpleTab[]>(TABS_STORAGE_KEY, tabs);
      if (activeTabId) {
        await StorageManager.setItem<string>(ACTIVE_TAB_ID_KEY, activeTabId);
      }
    } catch (error) {
      logger.error('Failed to save tabs', error);
      
      // Fallback: Try saving without screenshots if payload is too large
      try {
        const { tabs, activeTabId } = get();
        const tabsWithoutScreenshots = tabs.map(tab => {
          // Create a copy without the screenshot property
          const { screenshot, ...rest } = tab;
          return rest as SimpleTab;
        });
        
        logger.info('Attempting to save tabs without screenshots');
        await StorageManager.setItem<SimpleTab[]>(TABS_STORAGE_KEY, tabsWithoutScreenshots);
        
        if (activeTabId) {
          await StorageManager.setItem<string>(ACTIVE_TAB_ID_KEY, activeTabId);
        }
      } catch (retryError) {
        logger.error('Failed to save tabs (retry without screenshots)', retryError);
      }
    }
  },
  
  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find(tab => tab.id === activeTabId) || null;
  },
  
  getAllTabs: () => {
    return get().tabs;
  },
  
  getTabsCount: () => {
    return get().tabs.length;
  },

  setPendingUrlForActiveTab: (url: string | null) => {
    set({ pendingUrlForActiveTab: url });
  },

  getPendingUrlForActiveTab: () => {
    return get().pendingUrlForActiveTab;
  },

  clearPendingUrlForActiveTab: () => {
    set({ pendingUrlForActiveTab: null });
  },

  // Close all normal tabs
  closeAllNormalTabs: () => {
    const searchEngine = get().settings.searchEngine || 'google';
    const engineHomepages: {[key: string]: string} = {
      google: 'https://www.google.com',
      bing: 'https://www.bing.com',
      duckduckgo: 'https://duckduckgo.com',
      yahoo: 'https://www.yahoo.com',
      ecosia: 'https://www.ecosia.org',
    };
    
    const defaultUrl = engineHomepages[searchEngine] || 'https://www.google.com';
    const defaultTitle = searchEngine === 'google' ? 'Google' : 
                        searchEngine === 'bing' ? 'Bing' : 
                        searchEngine === 'duckduckgo' ? 'DuckDuckGo' : 
                        searchEngine === 'yahoo' ? 'Yahoo' : 
                        searchEngine === 'ecosia' ? 'Ecosia' : 'New Tab';
    
    // Create one default tab
    const defaultTab: SimpleTab = {
      id: Date.now().toString(),
      url: defaultUrl,
      title: defaultTitle,
      isActive: true,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    };
    
    set({ tabs: [defaultTab], activeTabId: defaultTab.id });
    get().saveTabs();
  },
  
  // Privacy tabs state (memory only - never persisted)
  privacyTabs: [],
  activePrivacyTabId: null,
  tabsViewMode: 'normal' as TabsViewMode,
  
  // Create privacy tab
  createPrivacyTab: (url?: string) => {
    const searchEngine = get().settings.searchEngine || 'google';
    const engineHomepages: {[key: string]: string} = {
      google: 'https://www.google.com',
      bing: 'https://www.bing.com',
      duckduckgo: 'https://duckduckgo.com',
      yahoo: 'https://www.yahoo.com',
      ecosia: 'https://www.ecosia.org',
    };
    
    const resolvedUrl = url || engineHomepages[searchEngine] || 'https://www.google.com';
    
    const newTab: SimpleTab = {
      id: `privacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: resolvedUrl,
      title: generateSimpleTitle(resolvedUrl),
      isActive: true,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isIncognito: true,
    };
    
    set(state => ({
      privacyTabs: [...state.privacyTabs, newTab],
      activePrivacyTabId: newTab.id,
      incognitoMode: true,
    }));
    
    // NOTE: Privacy tabs are NOT saved to storage
    return newTab.id;
  },
  
  // Switch to privacy tab
  switchToPrivacyTab: (tabId: string, forceReload = false) => {
    const { activePrivacyTabId: currentActiveTabId, privacyTabs } = get();
    const tab = privacyTabs.find(t => t.id === tabId);
    
    if (forceReload && tab && currentActiveTabId === tabId) {
      set({ activePrivacyTabId: tabId, pendingUrlForActiveTab: tab.url, incognitoMode: true });
    } else {
      set({ activePrivacyTabId: tabId, pendingUrlForActiveTab: null, incognitoMode: true });
    }
  },
  
  // Close privacy tab
  closePrivacyTab: (tabId: string) => {
    const { privacyTabs, activePrivacyTabId } = get();
    const newTabs = privacyTabs.filter(tab => tab.id !== tabId);
    
    let newActiveTabId = activePrivacyTabId;
    if (activePrivacyTabId === tabId) {
      newActiveTabId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
    }
    
    set({ privacyTabs: newTabs, activePrivacyTabId: newActiveTabId });
    
    // If no privacy tabs left, optionally disable incognito mode
    if (newTabs.length === 0) {
      // Don't auto-disable incognito mode, just leave empty
    }
  },
  
  // Update privacy tab URL
  updatePrivacyTabUrl: (tabId: string, url: string) => {
    const { privacyTabs } = get();
    const newTabs = privacyTabs.map(tab => {
      if (tab.id === tabId) {
        return { ...tab, url };
      }
      return tab;
    });
    
    set({ privacyTabs: newTabs });
    // Privacy tabs are NOT persisted
  },
  
  // Update privacy tab title
  updatePrivacyTabTitle: (tabId: string, title: string) => {
    const { privacyTabs } = get();
    const newTabs = privacyTabs.map(tab => {
      if (tab.id === tabId) {
        return { ...tab, title };
      }
      return tab;
    });
    
    set({ privacyTabs: newTabs });
    // Privacy tabs are NOT persisted
  },
  
  // Close all privacy tabs
  closeAllPrivacyTabs: () => {
    set({ privacyTabs: [], activePrivacyTabId: null });
    // Note: We don't disable incognito mode, user can still create new tabs
  },
  
  // Set tabs view mode
  setTabsViewMode: (mode: TabsViewMode) => {
    set({ tabsViewMode: mode });
    // If switching to privacy mode, enable incognito
    if (mode === 'privacy') {
      set({ incognitoMode: true });
    }
  },
  
  // Get privacy tabs count
  getPrivacyTabsCount: () => {
    return get().privacyTabs.length;
  },
  
  // Get active privacy tab
  getActivePrivacyTab: () => {
    const { privacyTabs, activePrivacyTabId } = get();
    return privacyTabs.find(tab => tab.id === activePrivacyTabId) || null;
  },
  
  // Theme and appearance
  darkMode: false,
  
  // Night mode state
  nightMode: false,
  toggleNightMode: async () => {
    const newValue = !get().nightMode;
    await get().updateSetting('nightMode', newValue);
  },
  
  // Desktop mode state
  desktopMode: false,
  toggleDesktopMode: async () => {
    const newValue = !get().desktopMode;
    await get().updateSetting('desktopMode', newValue);
  },
  
  // Incognito mode state
  incognitoMode: false,
  toggleIncognitoMode: async () => {
    const newValue = !get().incognitoMode;
    await get().updateSetting('incognitoMode', newValue);
  },
  
  // History state
  history: [],
  loadHistory: async () => {
    try {
      const history = await StorageManager.getHistory();
      // Ensure history is always an array
      const validHistory = Array.isArray(history) ? history : [];
      set({ history: validHistory });
    } catch (error) {
      logger.error('Failed to load history', error);
      set({ history: [] });
    }
  },
  
  addToHistory: async (item) => {
    try {
      const settings = get().settings;
      if (!settings.autoSaveHistory || get().incognitoMode) {
        return;
      }
      
      await StorageManager.addHistoryItem(item);
      
      // Update local state
      const newItem: HistoryItem = {
        ...item,
        id: Date.now().toString(),
        timestamp: Date.now(),
        visitCount: 1,
      };
      
      set(state => ({
        history: [newItem, ...state.history].slice(0, get().settings.maxHistoryItems || 1000)
      }));
      
      // Update search index
      SearchIndexManager.addToIndex(newItem, 'history');
    } catch (error) {
      logger.error('Failed to add to history', error, { item });
    }
  },
  
  clearHistory: async () => {
    try {
      await StorageManager.clearHistory();
      await get().loadHistory();
    } catch (error) {
      logger.error('Failed to clear history', error);
    }
  },
  
  searchHistory: async (query) => {
    try {
      return await StorageManager.searchHistory(query);
    } catch (error) {
      logger.error('Failed to search history', error, { query });
      return [];
    }
  },

  removeHistoryItem: async (id: string) => {
    try {
      await StorageManager.removeHistoryItem(id);
      set(state => ({
        history: state.history.filter(item => item.id !== id)
      }));
      SearchIndexManager.removeFromIndex(id);
    } catch (error) {
      logger.error('Failed to remove history item', error, { id });
    }
  },
  
  // Bookmarks state
  bookmarks: [],
  loadBookmarks: async () => {
    try {
      const bookmarks = await StorageManager.getBookmarks();
      // Ensure bookmarks is always an array
      const validBookmarks = Array.isArray(bookmarks) ? bookmarks : [];
      set({ bookmarks: validBookmarks });
    } catch (error) {
      logger.error('Failed to load bookmarks', error);
      set({ bookmarks: [] });
    }
  },
  
  addBookmark: async (item) => {
    try {
      await StorageManager.addBookmark(item);
      await SearchIndexManager.addToIndex({ ...item, id: '', dateAdded: Date.now() }, 'bookmark');
      await get().loadBookmarks();
    } catch (error) {
      logger.error('Failed to add bookmark', error, { item });
      throw error;
    }
  },
  
  removeBookmark: async (id) => {
    try {
      await StorageManager.removeBookmark(id);
      await SearchIndexManager.removeFromIndex(id);
      await get().loadBookmarks();
    } catch (error) {
      logger.error('Failed to remove bookmark', error, { id });
    }
  },
  
  updateBookmark: async (id, updates) => {
    try {
      await StorageManager.updateBookmark(id, updates);
      await get().loadBookmarks();
    } catch (error) {
      logger.error('Failed to update bookmark', error, { id, updates });
    }
  },
  
  searchBookmarks: async (query) => {
    try {
      return await StorageManager.searchBookmarks(query);
    } catch (error) {
      logger.error('Failed to search bookmarks', error, { query });
      return [];
    }
  },
  
  // Search functionality
  initializeSearch: async () => {
    try {
      await SearchIndexManager.initialize();
    } catch (error) {
      logger.error('Failed to initialize search', error);
    }
  },
  
  performSearch: async (query, options = {}) => {
    try {
      return await SearchIndexManager.search(query, options);
    } catch (error) {
      logger.error('Failed to perform search', error, { query, options });
      return [];
    }
  },
  
  // Downloads
  initializeDownloads: async () => {
    try {
      await DownloadManager.initialize();
    } catch (error) {
      logger.error('Failed to initialize downloads', error);
    }
  },
  
  // Initialization
  initialize: async () => {
    try {
      await get().loadSettings();
      await get().loadAdBlockerData(); // Load AdBlocker data
      await get().loadTabs();
      await get().loadHistory();
      await get().loadBookmarks();
      await get().initializeSearch();
      // await get().initializeDownloads(); // REMOVED: Deferred initialization
      
      // Set the homepage as the initial URL if no tabs are loaded
      if (get().tabs.length === 0) {
        const searchEngine = get().settings.searchEngine || 'google';
        const engineHomepages: {[key: string]: string} = {
          google: 'https://www.google.com',
          bing: 'https://www.bing.com',
          duckduckgo: 'https://duckduckgo.com',
          yahoo: 'https://www.yahoo.com',
          ecosia: 'https://www.ecosia.org',
        };
        
        let defaultUrl = engineHomepages[searchEngine] || 'https://www.google.com';
        
        get().createNewTab(defaultUrl);
      }
    } catch (error) {
      logger.error('Failed to initialize browser store', error);
      // If initialization fails due to corrupted data, reset and try again
      try {
        logger.info('Attempting to reset corrupted data');
        await StorageManager.resetCorruptedData();
        await get().loadSettings();
        await get().loadAdBlockerData(); // Load AdBlocker data on retry
        await get().loadHistory();
        await get().loadBookmarks();
      } catch (resetError) {
        logger.error('Failed to reset and reinitialize', resetError);
      }
    }
  },
}));