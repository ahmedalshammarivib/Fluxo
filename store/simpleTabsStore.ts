import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SimpleTab, SimpleTabsState, SimpleTabsActions } from '../types/simpleTabs';
import { useBrowserStore } from './browserStore';
import { logger } from '../utils/logger';

const SIMPLE_TABS_STORAGE_KEY = '@simple_tabs';

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
  if (!url || url.trim() === '') return 'https://www.google.com';
  if (url === 'about:blank') return 'https://www.google.com';
  
  // If URL contains protocol
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it looks like a URL
  if (url.includes('.') && !url.includes(' ')) {
    return `https://${url}`;
  }
  
  // Otherwise consider it a Google search
  return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
}

type SimpleTabsStore = SimpleTabsState & SimpleTabsActions;

export const useSimpleTabsStore = create<SimpleTabsStore>((set, get) => ({
  // Initial state
  tabs: [],
  activeTabId: null,

  // Create new tab
  createNewTab: (url?: string) => {
    const resolvedUrl = resolveUrl(url || 'https://www.google.com');
    const newTab: SimpleTab = {
      id: `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: generateSimpleTitle(resolvedUrl),
      url: resolvedUrl,
      isActive: true,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    };

    set((state) => {
      // Deactivate all other tabs
      const updatedTabs = state.tabs.map(tab => ({
        ...tab,
        isActive: false
      }));

      // Add new tab
      const newTabs = [...updatedTabs, newTab];
      
      // Save tabs immediately
      AsyncStorage.setItem(SIMPLE_TABS_STORAGE_KEY, JSON.stringify(newTabs))
        .catch(error => logger.error('Failed to save tabs', error));

      return {
        tabs: newTabs,
        activeTabId: newTab.id,
      };
    });

    // Add to history if not Google
    if (resolvedUrl !== 'https://www.google.com') {
      const browserStore = useBrowserStore.getState();
      browserStore.addToHistory({
        title: newTab.title,
        url: resolvedUrl,
      });
    }

    return newTab.id;
  },

  // Switch to tab
  switchToTab: (tabId: string) => {
    set((state) => {
      const tabExists = state.tabs.some(tab => tab.id === tabId);
      if (!tabExists) return state;

      return {
        tabs: state.tabs.map(tab => ({
          ...tab,
          isActive: tab.id === tabId,
          lastAccessed: tab.id === tabId ? Date.now() : tab.lastAccessed,
        })),
        activeTabId: tabId,
      };
    });

    get().saveTabs();
  },

  // Close tab
  closeTab: (tabId: string) => {
    set((state) => {
      const tabIndex = state.tabs.findIndex((tab) => tab.id === tabId);
      if (tabIndex === -1) return state;

      const newTabs = state.tabs.filter((tab) => tab.id !== tabId);
      let newActiveTabId = state.activeTabId;

      if (state.activeTabId === tabId) {
        if (newTabs.length === 0) {
          const defaultTab: SimpleTab = {
            id: `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: 'Google',
            url: 'https://www.google.com',
            isActive: true,
            createdAt: Date.now(),
            lastAccessed: Date.now(),
          };
          return {
            tabs: [defaultTab],
            activeTabId: defaultTab.id,
          };
        } else {
          const newActiveIndex = tabIndex > 0 ? tabIndex - 1 : 0;
          newActiveTabId = newTabs[newActiveIndex].id;
          const finalTabs = newTabs.map((tab, index) => {
            if (index !== newActiveIndex) return { ...tab, isActive: false };
            return {
              ...tab,
              isActive: true,
              lastAccessed: Date.now(),
            };
          });
          return {
            tabs: finalTabs,
            activeTabId: newActiveTabId,
          };
        }
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveTabId,
      };
    });

    get().saveTabs();
  },

  // Update tab URL
  updateTabUrl: (tabId: string, url: string) => {
    const resolvedUrl = resolveUrl(url);
    const title = generateSimpleTitle(resolvedUrl);
    
    set((state) => ({
      tabs: state.tabs.map(tab =>
        tab.id === tabId 
          ? { ...tab, url: resolvedUrl, title, lastAccessed: Date.now() }
          : tab
      ),
    }));

    get().saveTabs();
    
    // Add to history
    if (resolvedUrl !== 'https://www.google.com') {
      const browserStore = useBrowserStore.getState();
      browserStore.addToHistory({
        title,
        url: resolvedUrl,
      });
    }
  },

  // Update tab title
  updateTabTitle: (tabId: string, title: string) => {
    set((state) => ({
      tabs: state.tabs.map(tab =>
        tab.id === tabId 
          ? { ...tab, title, lastAccessed: Date.now() }
          : tab
      ),
    }));

    get().saveTabs();
  },

  // Get active tab
  getActiveTab: () => {
    const state = get();
    return state.tabs.find(tab => tab.isActive) || null;
  },

  // Get all tabs
  getAllTabs: () => {
    return get().tabs;
  },

  // Get tabs count
  getTabsCount: () => {
    return get().tabs.length;
  },

  // Load tabs from storage
  loadTabs: async () => {
    try {
      const storedTabs = await AsyncStorage.getItem(SIMPLE_TABS_STORAGE_KEY);
      if (storedTabs) {
        const parsedTabs: SimpleTab[] = JSON.parse(storedTabs);
        const activeTab = parsedTabs.find(tab => tab.isActive);
        
        set({
          tabs: parsedTabs,
          activeTabId: activeTab?.id || null,
        });
      } else {
        // Create default tab
        get().createNewTab();
      }
    } catch (error) {
      logger.error('Failed to load tabs', error);
      // Create default tab in case of error
      get().createNewTab();
    }
  },

  // Save tabs to storage
  saveTabs: async () => {
    try {
      const { tabs } = get();
      await AsyncStorage.setItem(SIMPLE_TABS_STORAGE_KEY, JSON.stringify(tabs));
    } catch (error) {
      logger.error('Failed to save tabs', error);
    }
  },
}));

// Export functions for direct use
export const {
  createNewTab,
  switchToTab,
  closeTab,
  updateTabUrl,
  updateTabTitle,
  getActiveTab,
  getAllTabs,
  getTabsCount,
} = useSimpleTabsStore.getState();