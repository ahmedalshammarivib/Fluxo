import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  Clipboard,
  BackHandler,
  Linking,
  Share,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { FileDownloadEvent } from 'react-native-webview/lib/WebViewTypes';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsiveScreen, useResponsiveDimensions } from '@/hooks/useResponsiveScreen';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import { useBrowserStore } from '@/store/browserStore';
import { CurrencyWidget } from '@/components/CurrencyWidget';
import { QuickAccessGrid } from '@/components/QuickAccessGrid';
import { BottomNavigation } from '@/components/BottomNavigation';
import { MenuModal } from '@/components/MenuModal';
import ContextMenu, { ContextMenuItem } from '@/components/ContextMenu';
import { AnimatedAdBlockIcon } from '@/components/AnimatedAdBlockIcon';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { FluxoLogo } from '@/components/FluxoLogo';
import WelcomeScreen from '@/components/WelcomeScreen';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import DownloadManager from '@/utils/downloadManager';
import ImageManager from '@/utils/imageManager';
import AdBlockManager, { AdBlockStats } from '@/utils/adBlockManager';
import AppearanceManager from '@/utils/appearanceManager';
import AutofillManager from '@/utils/autofillManager';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import { PrivacyShieldPopup } from '@/components/PrivacyShieldPopup';
import { WebViewErrorView } from '@/components/WebViewErrorView';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/utils/logger';
import { WebViewScriptManager } from '@/utils/webViewScriptManager';
import NightModeManager from '@/utils/nightModeManager';
import { URLValidator } from '@/utils/urlValidator';
import { TabWebView, TabWebViewHandle } from '@/components/TabWebView';
import { WebViewState } from '@/hooks/useWebView';
import {
  responsiveSpacing,
  responsiveFontSize,
  responsiveIconSize,
  responsiveWidth,
  responsiveHeight,
  responsiveBorderRadius,
  isSmallScreen,
  wp,
  hp
} from '@/utils/responsive';
import { getThemeColors, colors } from '@/theme/colors';
import { SimpleTab } from '@/types/simpleTabs';

import { LongPressData } from '@/types/webView';
import { getMobileUserAgent, getDesktopUserAgent } from '@/utils/userAgent';

// Removed Dimensions.get() - using Flexbox and responsive utilities instead

function BrowserScreen() {
  const insets = useSafeAreaInsets();
  const webViewContainerRef = useRef<View>(null);
  const responsive = useResponsiveScreen();
  const dimensions = useResponsiveDimensions();

  // Use insets.top for accurate status bar height on all devices
  const statusBarHeight = insets.top;

  const params = useLocalSearchParams();

  const [searchText, setSearchText] = useState('');
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // Local state - defined before useWebView to avoid "used before declaration" error
  const [url, setUrl] = useState('');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [isHomePage, setIsHomePage] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showFindInPage, setShowFindInPage] = useState(false);
  const [findText, setFindText] = useState('');
  const [findMatches, setFindMatches] = useState({ current: 0, total: 0 });

  // Debounce search in page to prevent freezing while typing
  useEffect(() => {
    if (!showFindInPage) return;

    const timer = setTimeout(() => {
      if (findText) {
        findInPage(findText);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [findText, showFindInPage]);

  const urlInputRef = useRef<TextInput>(null);

  const {
    tabs,
    privacyTabs,
    activeTabId,
    activePrivacyTabId,
    incognitoMode,
    isAdBlockEnabled,
    toggleAdBlock,
    darkMode,
    nightMode,
    toggleNightMode,
    desktopMode,
    toggleDesktopMode,
    toggleIncognitoMode,
    addToHistory,
    addBookmark,
    initialize,
    settings,
    adBlocker,
    getActiveTab,
    updateTabUrl,
    updateTabTitle,
    updateTabScreenshot,
    updatePrivacyTabScreenshot,
    loadTabs,
    createNewTab,
    createPrivacyTab,
    getPendingUrlForActiveTab,
    clearPendingUrlForActiveTab,
  } = useBrowserStore();

  // Tab Refs
  const tabRefs = useRef<Record<string, TabWebViewHandle>>({});

  // Debounce for screenshot capture
  const debouncedCaptureScreenshot = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to get active tab ID
  const getActiveTabId = useCallback(() => {
    return incognitoMode ? activePrivacyTabId : activeTabId;
  }, [incognitoMode, activePrivacyTabId, activeTabId]);

  const getActiveTabRef = useCallback(() => {
    const id = getActiveTabId();
    if (!id) return undefined;
    return tabRefs.current[id];
  }, [getActiveTabId]);

  // Helper to create tab based on current mode
  const createTabForCurrentMode = useCallback((url: string) => {
    if (incognitoMode) {
      createPrivacyTab(url);
    } else {
      createNewTab(url);
    }
  }, [incognitoMode, createNewTab, createPrivacyTab]);

  // Capture WebView screenshot when page loads
  const captureWebViewScreenshot = useCallback(async () => {
    try {
      // Check if container ref exists
      if (!webViewContainerRef.current) {
        return;
      }

      // Get current mode and active tab IDs from store
      const { incognitoMode, activeTabId, activePrivacyTabId, tabs, privacyTabs } = useBrowserStore.getState();

      // Determine which tab is active based on mode
      let activeTab: SimpleTab | undefined;
      if (incognitoMode && activePrivacyTabId) {
        // In privacy mode - get privacy tab
        activeTab = privacyTabs.find(tab => tab.id === activePrivacyTabId);
      } else if (!incognitoMode && activeTabId) {
        // In normal mode - get normal tab
        activeTab = tabs.find(tab => tab.id === activeTabId);
      }

      if (!activeTab) {
        return;
      }

      // Capture the container (not WebView directly)
      const options = Platform.OS === 'ios'
        ? { format: 'jpg', quality: 0.4, result: 'base64', width: 120, height: 80 }
        : { format: 'jpg', quality: 0.7, result: 'base64', width: 200, height: 150 };

      const uri = await captureRef(webViewContainerRef, options as any);

      const screenshot = `data:image/jpeg;base64,${uri}`;

      // Update the appropriate tab based on mode
      if (incognitoMode || activeTab.isIncognito) {
        updatePrivacyTabScreenshot(activeTab.id, screenshot);
      } else {
        updateTabScreenshot(activeTab.id, screenshot);
      }
    } catch (error) {
      // Silent fail - screenshots are optional
      logger.warn('Screenshot capture failed', error as any);
    }
  }, [updatePrivacyTabScreenshot, updateTabScreenshot]);

  // Handle tab load end - trigger screenshot
  const handleTabLoadEnd = useCallback((tabId: string) => {
    // Only capture if the loaded tab is the active one
    const { incognitoMode, activeTabId, activePrivacyTabId } = useBrowserStore.getState();
    const currentActiveId = incognitoMode ? activePrivacyTabId : activeTabId;

    if (tabId !== currentActiveId) return;

    // Clear existing timer
    if (debouncedCaptureScreenshot.current) {
      clearTimeout(debouncedCaptureScreenshot.current);
    }

    // Debounce capture
    debouncedCaptureScreenshot.current = setTimeout(() => {
      captureWebViewScreenshot();
    }, 800);
  }, [captureWebViewScreenshot]);

  // Cleanup screenshot timer
  useEffect(() => {
    return () => {
      if (debouncedCaptureScreenshot.current) {
        clearTimeout(debouncedCaptureScreenshot.current);
      }
    };
  }, []);

  // Shim for legacy webViewRef usage
  const webViewRef = useMemo(() => ({
    get current() {
      return getActiveTabRef()?.getWebViewRef()?.current || null;
    }
  }), [getActiveTabRef]);

  // Navigation proxy
  const navigation = useMemo(() => ({
    loadUrl: (url: string) => getActiveTabRef()?.loadUrl(url),
    goBack: () => getActiveTabRef()?.goBack(),
    goForward: () => getActiveTabRef()?.goForward(),
    reload: () => getActiveTabRef()?.reload(),
    stopLoading: () => getActiveTabRef()?.stopLoading(),
  }), [getActiveTabRef]);

  // WebViewState local state (mirrors active tab)
  const [webViewState, setWebViewState] = useState<WebViewState>({
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    progress: 0,
    currentUrl: '',
    error: null,
  });

  // Handler for tab state changes
  const handleTabStateChange = useCallback((tabId: string, state: WebViewState) => {
    if (tabId === getActiveTabId()) {
      setWebViewState(state);
    }
    // Trigger screenshot update on state change (navigation, loading, etc.)
    handleTabLoadEnd(tabId);
  }, [getActiveTabId, handleTabLoadEnd]);

  // Sync isHomePage and URL with active tab
  useEffect(() => {
    const activeTab = getActiveTab();
    if (activeTab) {
      const isHome = !activeTab.url || activeTab.url === 'about:blank';
      setIsHomePage(isHome);
      // Update URL bar text
      if (isHome) {
        setUrl('');
      } else if (activeTab.url !== url) {
        // Only update if different to avoid typing interference?
        // Actually, usually we only update URL bar on navigation completion or specific events.
        // But if we switch tabs, we MUST update the URL bar.
        setUrl(activeTab.url);
      }
    }
  }, [activeTabId, activePrivacyTabId, incognitoMode, getActiveTab]);

  // Destructure for UI
  const currentUrl = webViewState.currentUrl;
  const isLoading = webViewState.isLoading;
  const canGoBack = webViewState.canGoBack;
  const canGoForward = webViewState.canGoForward;
  const progress = webViewState.progress;
  const error = webViewState.error as any;


  // Context menu state
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuItems, setContextMenuItems] = useState<ContextMenuItem[]>([]);
  const [longPressData, setLongPressData] = useState<LongPressData | null>(null);
  const longPressDataRef = useRef<LongPressData | null>(null); // Ref to hold latest long press data for context menu actions

  // Search bar context menu state
  const [searchContextMenuVisible, setSearchContextMenuVisible] = useState(false);
  const [searchContextMenuPosition, setSearchContextMenuPosition] = useState({ x: 0, y: 0 });
  const [searchContextMenuItems, setSearchContextMenuItems] = useState<ContextMenuItem[]>([]);

  // Image preview modal state
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');

  // Privacy Shield Popup state
  const [privacyPopupVisible, setPrivacyPopupVisible] = useState(false);

  // Appearance state - initialize with a safe default
  const [textZoom, setTextZoom] = useState<number>(100);

  // Helper to calculate text zoom based on both page zoom and font size settings
  const calculateTextZoom = useCallback(() => {
    const pageZoom = AppearanceManager.getCurrentPageZoom() || 100;
    const fontSize = AppearanceManager.getCurrentFontSize() || 14;
    // Base font size is 14. 
    // If font size is 14, multiplier is 1.
    // If font size is 18, multiplier is ~1.28.
    const fontMultiplier = fontSize / 14;
    return Math.round(pageZoom * fontMultiplier);
  }, []);

  useEffect(() => {
    // Set initial value from manager
    setTextZoom(calculateTextZoom());
  }, []);

  // Animated values for professional bar color transitions
  const topBarAnimatedValue = useRef(new Animated.Value(0)).current;
  const bottomBarAnimatedValue = useRef(new Animated.Value(0)).current;
  const scaleAnimatedValue = useRef(new Animated.Value(1)).current;

  // Fixed: Removed debug console.log for production
  useEffect(() => {
    // Menu visibility tracking for analytics (if needed)
  }, [isMenuVisible]);

  // Performance optimization: Clear image cache periodically
  useEffect(() => {
    const clearCacheInterval = setInterval(() => {
      // Clear cache if it gets too large (more than 50 items)
      if (ImageManager.getCacheSize() > 50) {
        ImageManager.clearCache();
      }
    }, 300000); // Check every 5 minutes

    // Subscribe to appearance changes
    const unsubscribeAppearance = AppearanceManager.registerWebViewInstance((type, value) => {
      if (type === 'pageZoom' || type === 'fontSize') {
        setTextZoom(calculateTextZoom());
      }
    });

    // Cleanup on unmount
    return () => {
      clearInterval(clearCacheInterval);
      ImageManager.clearCache();
      unsubscribeAppearance();
    };
  }, []);

  // Memory leak fix: Cleanup WebView and related resources on unmount
  useEffect(() => {
    return () => {
      // Stop loading and cleanup WebView
      if (webViewRef.current) {
        try {
          webViewRef.current.stopLoading();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const resolveContextUrl = useCallback((rawUrl?: string): string | null => {
    if (!rawUrl) return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('file:')) {
      return trimmed;
    }
    try {
      if (currentUrl && (currentUrl.startsWith('http') || currentUrl.startsWith('file'))) {
        return new URL(trimmed, currentUrl).toString();
      }
      return new URL(trimmed).toString();
    } catch {
      return null;
    }
  }, [currentUrl]);

  // Handle long press on WebView elements with performance optimizations
  const handleLongPress = useCallback((data: LongPressData) => {
    if (!data) return;
    
    logger.debug('[Aura] Received long press data', {
      type: data.elementType,
      x: data.x,
      y: data.y
    });
    
    const longPressData = data;
    // FIXED: Removed debug console.log for production
    setLongPressData(longPressData);
    longPressDataRef.current = longPressData; // Update ref for immediate access in callbacks

    const {
      x = 0,
      y = 0,
      elementType = '',
      src = '',
      href = '',
      value = '',
      selectionStart = 0,
      selectionEnd = 0
    } = longPressData;

    let text = longPressData.text || '';

    // If it's an input and we have a selection, use that for text
    if (elementType === 'input' && value && selectionStart !== selectionEnd) {
      text = value.substring(selectionStart, selectionEnd);
      // Update the ref data as well for the handlers
      longPressData.text = text;
    } else if (elementType === 'input' && value && !text) {
      // If no selection but we have a value, use value as text fallback
      text = value;
      longPressData.text = text;
    }

    // Calculate top offset (StatusBar + TopBar)
    // Use the same height calculation as styles.topBar
    const topBarHeight = responsiveHeight(isSmallScreen() ? 70 : 80);
    // Add status bar height (approximated if not available, but usually covered by SafeArea)
    // Since ContextMenu is a Modal (absolute over screen), we need absolute screen coordinates.
    // The WebView is below the top bar.
    // We need to check if the status bar is translucent or not.
    // Assuming standard layout where TopBar is at the top of the content area.
    const topOffset = statusBarHeight + topBarHeight;

    // Performance optimization: Preload image info for images
    if (elementType === 'image' && src) {
      const resolvedSrc = resolveContextUrl(src);
      if (resolvedSrc) {
        // Preload image information in background for better performance
        ImageManager.getImageInfo(resolvedSrc).catch(() => {
          // Ignore preload errors - this is just for performance
        });
      }
    }

    // Make sure we show the context menu
    setContextMenuVisible(true);
    // Position will be handled by ContextMenu component with proper constraints
    // We add the topOffset to y because WebView coordinates start after the TopBar
    setContextMenuPosition({ x, y: y + topOffset });

    // Create context menu items based on element type
    const menuItems: ContextMenuItem[] = [];

    // Use the enhanced elementType property from our improved detection
    switch (elementType) {
      case 'image':
        // Enhanced Image options with better organization
        const imageUrl = src;
        const resolvedImageUrl = resolveContextUrl(imageUrl) || imageUrl;
        const isValidImage = resolvedImageUrl ? ImageManager.isValidImageUrl(resolvedImageUrl) : false;

        // Primary actions
        menuItems.push(
          {
            id: 'preview-image',
            icon: 'eye-outline',
            title: 'Preview Image',
            onPress: () => handleContextMenuItemPress('preview-image')
          },
          {
            id: 'open-image-new-tab',
            icon: 'open-outline',
            title: 'Open in New Tab',
            onPress: () => handleContextMenuItemPress('open-image-new-tab')
          }
        );

        // Download and save actions
        if (isValidImage) {
          menuItems.push(
            {
              id: 'save-image',
              icon: 'download-outline',
              title: 'Download Image',
              onPress: () => handleContextMenuItemPress('save-image')
            }
          );
        }

        // Search and analysis actions
        menuItems.push(
          {
            id: 'search-image',
            icon: 'search-outline',
            title: 'Search Google for Image',
            onPress: () => handleContextMenuItemPress('search-image')
          },
          {
            id: 'search-image-bing',
            icon: 'globe-outline',
            title: 'Search Bing for Image',
            onPress: () => handleContextMenuItemPress('search-image-bing')
          }
        );

        // Sharing and copying actions
        menuItems.push(
          {
            id: 'copy-image-link',
            icon: 'copy-outline',
            title: 'Copy Image Address',
            onPress: () => handleContextMenuItemPress('copy-image-link')
          },
          {
            id: 'share-image',
            icon: 'share-outline',
            title: 'Share Image',
            onPress: () => handleContextMenuItemPress('share-image')
          }
        );

        // Additional contextual actions
        if (isValidImage) {
          menuItems.push(
            {
              id: 'image-info',
              icon: 'information-circle-outline',
              title: 'Image Information',
              onPress: () => handleContextMenuItemPress('image-info')
            }
          );
        }
        break;

      case 'video':
        // Video options
        menuItems.push(
          {
            id: 'open-video-new-tab',
            icon: 'open-outline',
            title: 'Open Video in New Tab',
            onPress: () => handleContextMenuItemPress('open-video-new-tab')
          },
          {
            id: 'open-link-incognito',
            icon: 'eye-off-outline',
            title: 'Open in Incognito Tab',
            onPress: () => handleContextMenuItemPress('open-link-incognito')
          },
          {
            id: 'preview-video',
            icon: 'eye-outline',
            title: 'Preview Video',
            onPress: () => handleContextMenuItemPress('preview-video')
          },
          {
            id: 'save-video',
            icon: 'download-outline',
            title: 'Download Video',
            onPress: () => handleContextMenuItemPress('save-video')
          },
          {
            id: 'copy-video-link',
            icon: 'link-outline',
            title: 'Copy Video Link',
            onPress: () => handleContextMenuItemPress('copy-video-link')
          },
          {
            id: 'share-video',
            icon: 'share-outline',
            title: 'Share Video',
            onPress: () => handleContextMenuItemPress('share-video')
          }
        );
        break;

      case 'link':
        // Link options
        menuItems.push(
          {
            id: 'open-link-new-tab',
            icon: 'add-circle-outline',
            title: 'Open in New Tab',
            onPress: () => handleContextMenuItemPress('open-link-new-tab')
          },
          {
            id: 'open-link-incognito',
            icon: 'eye-off-outline',
            title: 'Open in Incognito Tab',
            onPress: () => handleContextMenuItemPress('open-link-incognito')
          },
          {
            id: 'preview-link',
            icon: 'eye-outline',
            title: 'Preview Page',
            onPress: () => handleContextMenuItemPress('preview-link')
          },
          {
            id: 'copy-link',
            icon: 'copy-outline',
            title: 'Copy Link Address',
            onPress: () => handleContextMenuItemPress('copy-link')
          },
          {
            id: 'download-link',
            icon: 'download-outline',
            title: 'Download Link',
            onPress: () => handleContextMenuItemPress('download-link')
          },
          {
            id: 'share-link',
            icon: 'share-outline',
            title: 'Share Link',
            onPress: () => handleContextMenuItemPress('share-link')
          }
        );
        break;

      case 'text-selection':
        menuItems.push(
          {
            id: 'cut-text',
            icon: 'cut-outline',
            title: 'Cut',
            onPress: () => handleContextMenuItemPress('cut-text')
          },
          {
            id: 'copy-text',
            icon: 'copy-outline',
            title: 'Copy',
            onPress: () => handleContextMenuItemPress('copy-text')
          },
          {
            id: 'paste',
            icon: 'clipboard-outline',
            title: 'Paste',
            onPress: () => handleContextMenuItemPress('paste')
          },
          {
            id: 'select-all',
            icon: 'checkmark-done-outline',
            title: 'Select All',
            onPress: () => handleContextMenuItemPress('select-all')
          },
          {
            id: 'share-text',
            icon: 'share-outline',
            title: 'Share',
            onPress: () => handleContextMenuItemPress('share-text')
          },
          {
            id: 'search-text',
            icon: 'search-outline',
            title: 'Search',
            onPress: () => handleContextMenuItemPress('search-text')
          },
          {
            id: 'translate-text',
            icon: 'language-outline',
            title: 'Translate',
            onPress: () => handleContextMenuItemPress('translate-text')
          }
        );
        break;

      case 'input':
        menuItems.push(
          {
            id: 'cut-text',
            icon: 'cut-outline',
            title: 'Cut',
            onPress: () => handleContextMenuItemPress('cut-text')
          },
          {
            id: 'copy-text',
            icon: 'copy-outline',
            title: 'Copy',
            onPress: () => handleContextMenuItemPress('copy-text')
          },
          {
            id: 'paste',
            icon: 'clipboard-outline',
            title: 'Paste',
            onPress: () => handleContextMenuItemPress('paste')
          },
          {
            id: 'select-all',
            icon: 'checkmark-done-outline',
            title: 'Select All',
            onPress: () => handleContextMenuItemPress('select-all')
          },
          {
            id: 'clear-input',
            icon: 'trash-outline',
            title: 'Clear Text',
            onPress: () => handleContextMenuItemPress('clear-input')
          }
        );
        break;

      default:
        // Default/generic options
        if (text && text.trim()) {
          menuItems.push(
            {
              id: 'copy-text',
              icon: 'copy-outline',
              title: 'Copy Text',
              onPress: () => handleContextMenuItemPress('copy-text')
            },
            {
              id: 'share-text',
              icon: 'share-outline',
              title: 'Share Text',
              onPress: () => handleContextMenuItemPress('share-text')
            },
            {
              id: 'search-text',
              icon: 'search-outline',
              title: 'Search Text',
              onPress: () => handleContextMenuItemPress('search-text')
            }
          );
        } else {
          menuItems.push(
            {
              id: 'reload-page',
              icon: 'refresh-outline',
              title: 'Reload Page',
              onPress: () => handleContextMenuItemPress('reload-page')
            },
            {
              id: 'view-page-source',
              icon: 'code-outline',
              title: 'View Page Source',
              onPress: () => handleContextMenuItemPress('view-page-source')
            }
          );
        }
        break;
    }

    setContextMenuItems(menuItems);
    setContextMenuVisible(true);
  }, [statusBarHeight, isSmallScreen, responsiveHeight, resolveContextUrl, ImageManager.getImageInfo]);

  // Handle context menu item selection
  const handleContextMenuItemPress = async (itemId: string) => {
    // Use ref to get the most up-to-date data, avoiding stale state in closures
    const longPressData = longPressDataRef.current;

    // FIXED: Removed debug console.log for production
    if (!longPressData) {
      // FIXED: Removed debug console.log for production
      return;
    }

    switch (itemId) {
      // Enhanced Image actions with ImageManager
      case 'open-image-new-tab':
        if (longPressData.src) {
          const resolvedUrl = resolveContextUrl(longPressData.src);
          if (resolvedUrl) {
            createTabForCurrentMode(resolvedUrl);
            // Alert removed as per user request
          } else {
            Alert.alert('Invalid Image', 'This doesn\'t appear to be a valid image URL');
          }
        }
        break;

      case 'preview-image':
        if (longPressData.src) {
          const resolvedUrl = resolveContextUrl(longPressData.src);
          if (!resolvedUrl) {
            Alert.alert('Invalid Image', 'This doesn\'t appear to be a valid image URL');
            break;
          }
          // Close context menu first
          setContextMenuVisible(false);
          // Show enhanced image preview modal
          setPreviewImageUrl(resolvedUrl);
          setImagePreviewVisible(true);
          // Preload image info for better performance
          ImageManager.getImageInfo(resolvedUrl).catch(() => {
            // Ignore preload errors
          });
        }
        break;

      case 'save-image':
        if (longPressData.src) {
          const resolvedUrl = resolveContextUrl(longPressData.src);
          if (!resolvedUrl) {
            Alert.alert('Invalid Image', 'This doesn\'t appear to be a valid image URL');
            break;
          }
          // Use enhanced ImageManager for download
          await ImageManager.downloadImage(resolvedUrl, {
            showSuccessAlert: true,
            onError: (error) => {
              logger.error('Image download failed', error, {
                imageUrl: resolvedUrl,
                source: 'save-image'
              });
            }
          });
        }
        break;

      case 'copy-image-link':
        if (longPressData.src) {
          const resolvedUrl = resolveContextUrl(longPressData.src);
          if (!resolvedUrl) {
            Alert.alert('Invalid Image', 'This doesn\'t appear to be a valid image URL');
            break;
          }
          // Use enhanced ImageManager for copying
          await ImageManager.copyImageUrl(resolvedUrl, {
            showSuccessAlert: false, // Suppressed as per user request
            customSuccessMessage: 'Image URL copied to clipboard'
          });
        }
        break;

      case 'search-image':
        if (longPressData.src) {
          // Use enhanced ImageManager for reverse image search
          try {
            const resolvedUrl = resolveContextUrl(longPressData.src);
            if (!resolvedUrl) {
              Alert.alert('Invalid Image', 'This doesn\'t appear to be a valid image URL');
              break;
            }
            const searchUrl = await ImageManager.searchImage(resolvedUrl, 'google', {
              showSuccessAlert: false // Suppressed as per user request
            });
            createTabForCurrentMode(searchUrl);
          } catch (error) {
            logger.error('Google image search failed', error, {
              imageUrl: longPressData.src
            });
            Alert.alert('Search Failed', 'Unable to start image search. Please try again.');
          }
        }
        break;

      case 'search-image-bing':
        if (longPressData.src) {
          // Use enhanced ImageManager for Bing reverse image search
          try {
            const resolvedUrl = resolveContextUrl(longPressData.src);
            if (!resolvedUrl) {
              Alert.alert('Invalid Image', 'This doesn\'t appear to be a valid image URL');
              break;
            }
            const searchUrl = await ImageManager.searchImage(resolvedUrl, 'bing', {
              showSuccessAlert: false // Suppressed as per user request
            });
            createTabForCurrentMode(searchUrl);
          } catch (error) {
            logger.error('Bing image search failed', error, {
              imageUrl: longPressData.src
            });
            Alert.alert('Search Failed', 'Unable to start Bing image search. Please try again.');
          }
        }
        break;

      case 'image-info':
        if (longPressData.src) {
          // Show detailed image information
          try {
            const resolvedUrl = resolveContextUrl(longPressData.src);
            if (!resolvedUrl) {
              Alert.alert('Invalid Image', 'This doesn\'t appear to be a valid image URL');
              break;
            }
            const imageInfo = await ImageManager.getImageInfo(resolvedUrl);
            const infoText = `Image Information:\n\n` +
              `URL: ${imageInfo.url}\n` +
              `Format: ${imageInfo.format || 'Unknown'}\n` +
              `${imageInfo.width && imageInfo.height ? `Dimensions: ${imageInfo.width} × ${imageInfo.height}px\n` : ''}` +
              `${imageInfo.size ? `Size: ${(imageInfo.size / 1024).toFixed(1)} KB\n` : ''}`;

            Alert.alert(
              'Image Information',
              infoText,
              [
                { text: 'Copy URL', onPress: () => ImageManager.copyImageUrl(resolvedUrl) },
                { text: 'OK', style: 'default' }
              ]
            );
          } catch (error) {
            logger.error('Failed to retrieve image information', error, {
              imageUrl: longPressData.src
            });
            Alert.alert('Information Unavailable', 'Unable to retrieve image details. Please try again.');
          }
        }
        break;

      // Link actions
      case 'open-link-new-tab':
        if (longPressData.href) {
          const resolvedUrl = resolveContextUrl(longPressData.href);
          if (resolvedUrl) {
            createTabForCurrentMode(resolvedUrl);
          } else {
            Alert.alert('Invalid Link', 'This doesn\'t appear to be a valid link URL');
          }
        }
        break;

      // Video actions
      case 'open-video-new-tab':
        if (longPressData.src) {
          const resolvedUrl = resolveContextUrl(longPressData.src);
          if (!resolvedUrl) {
            Alert.alert('Invalid Video', 'This doesn\'t appear to be a valid video URL');
            break;
          }
          // Open video in a new tab
          createTabForCurrentMode(resolvedUrl);
          // Alert removed as per user request
        }
        break;

      case 'open-link-incognito':
        if (longPressData.href || longPressData.src) {
          const targetUrl = longPressData.href || longPressData.src;
          const resolvedUrl = resolveContextUrl(targetUrl!);
          if (resolvedUrl) {
            // Create privacy tab
            createPrivacyTab(resolvedUrl);
            // Switch to browser view if we are on home page
            setIsHomePage(false);
            // Update the URL to the newly created tab's URL
            setUrl(resolvedUrl);
            // Close context menu
            setContextMenuVisible(false);
          } else {
            Alert.alert('Invalid Link', 'This doesn\'t appear to be a valid URL');
          }
        }
        break;

      // Link actions
      case 'copy-link':
        if (longPressData.href) {
          const resolvedUrl = resolveContextUrl(longPressData.href);
          if (!resolvedUrl) {
            Alert.alert('Invalid Link', 'This doesn\'t appear to be a valid link URL');
            break;
          }
          Clipboard.setString(resolvedUrl);
        }
        break;

      // Text actions
      case 'cut-text':
        if (longPressData.text) {
          Clipboard.setString(longPressData.text);
          // Try to delete selection using document.execCommand or selection range manipulation
          const cutJs = `
            (function() {
              try {
                const activeElement = document.activeElement;
                const isInput = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);
                
                if (isInput) {
                  // Try execCommand cut first
                  if (document.execCommand('cut')) return;
                  
                  if (activeElement.isContentEditable) {
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                      selection.deleteFromDocument();
                    }
                  } else {
                    const start = activeElement.selectionStart;
                    const end = activeElement.selectionEnd;
                    if (start !== end) {
                      const val = activeElement.value;
                      activeElement.value = val.slice(0, start) + val.slice(end);
                      activeElement.selectionStart = activeElement.selectionEnd = start;
                    }
                  }
                  
                  const event = new Event('input', { bubbles: true });
                  activeElement.dispatchEvent(event);
                } else {
                  const selection = window.getSelection();
                  if (selection.rangeCount > 0) {
                    selection.deleteFromDocument();
                  }
                }
              } catch(e) {}
            })();
          `;
          webViewRef.current?.injectJavaScript(cutJs);
        }
        break;

      case 'translate-text':
        if (longPressData.text) {
          const encodedText = encodeURIComponent(longPressData.text);
          const translateUrl = `https://translate.google.com/?sl=auto&tl=auto&text=${encodedText}&op=translate`;
          createTabForCurrentMode(translateUrl);
        }
        break;

      case 'copy-text':
        if (longPressData.text) {
          Clipboard.setString(longPressData.text);
        }
        break;

      case 'search-text':
        if (longPressData.text) {
          const searchQuery = encodeURIComponent(longPressData.text);
          const searchUrl = `https://www.google.com/search?q=${searchQuery}`;
          createTabForCurrentMode(searchUrl);
        }
        break;

      case 'preview-video':
        if (longPressData.src) {
          // Show video preview in a modal
          // In a real implementation, you would show a modal with the video player
        }
        break;

      case 'save-video':
        if (longPressData.src) {
          // Use DownloadManager directly for better handling
          const downloadUrl = longPressData.src;
          try {
            // Extract filename from URL or use default
            const filename = downloadUrl.split('/').pop() || 'video.mp4';
            await DownloadManager.downloadFromWebView(downloadUrl, filename);
          } catch (error) {
            logger.error('Video download failed', error, {
              videoUrl: longPressData.src,
              filename: downloadUrl.split('/').pop()
            });
            // Fallback - open in system browser
            Linking.openURL(downloadUrl)
              .catch(err => Alert.alert('Error', 'Could not start download: ' + err.message));
          }
        }
        break;

      case 'copy-video-link':
        if (longPressData.src) {
          Clipboard.setString(longPressData.src);
        }
        break;

      // Link actions handled above
      // Duplicate open-link-new-tab removed


      // Removed duplicate case - handled below with proper incognito tab creation

      case 'preview-link':
        if (longPressData.href) {
          // Show link preview
          // In a real implementation, you would show a preview of the page
        }
        break;

      // Duplicate copy-link removed


      case 'download-link':
        if (longPressData.href) {
          // Use proper download handling
          const downloadUrl = longPressData.href;
          if (typeof handleDownloadRequest === 'function') {
            handleDownloadRequest({ nativeEvent: { url: downloadUrl } });
          } else {
            Linking.openURL(downloadUrl)
              .catch(err => Alert.alert('Error', 'Could not open download URL'));
          }
        }
        break;

      // Text actions
      // Removed duplicate cases - handled above with better implementations

      // Input field actions
      case 'paste':
        // Execute JavaScript to paste text at the cursor position
        Clipboard.getString().then(text => {
          if (text) {
            const pasteJs = `
              (function() {
                try {
                  const activeElement = document.activeElement;
                  if (!activeElement) return;

                  const isInput = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
                  const isContentEditable = activeElement.isContentEditable;

                  if (isInput) {
                    const start = activeElement.selectionStart || 0;
                    const end = activeElement.selectionEnd || 0;
                    const value = activeElement.value;
                    activeElement.value = value.substring(0, start) + ${JSON.stringify(text)} + value.substring(end);
                    activeElement.selectionStart = activeElement.selectionEnd = start + ${text.length};
                    
                    const event = new Event('input', { bubbles: true });
                    activeElement.dispatchEvent(event);
                  } else if (isContentEditable) {
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                      const range = selection.getRangeAt(0);
                      range.deleteContents();
                      const textNode = document.createTextNode(${JSON.stringify(text)});
                      range.insertNode(textNode);
                      
                      // Move cursor to end of pasted text
                      range.setStartAfter(textNode);
                      range.setEndAfter(textNode);
                      selection.removeAllRanges();
                      selection.addRange(range);
                    } else {
                      activeElement.innerText += ${JSON.stringify(text)};
                    }
                    
                    const event = new Event('input', { bubbles: true });
                    activeElement.dispatchEvent(event);
                  }
                } catch(e) {}
              })();
            `;
            webViewRef.current?.injectJavaScript(pasteJs);
          }
        });
        break;

      case 'select-all':
        // Execute JavaScript to select all text in the input field
        const selectAllJs = `
          (function() {
            try {
              const activeElement = document.activeElement;
              if (!activeElement) return;
              
              if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
                activeElement.select();
              } else if (activeElement.isContentEditable) {
                const range = document.createRange();
                range.selectNodeContents(activeElement);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
              } else {
                // Fallback for general text selection
                const range = document.createRange();
                range.selectNodeContents(document.body);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
              }
            } catch(e) {}
          })();
        `;
        webViewRef.current?.injectJavaScript(selectAllJs);
        break;

      case 'clear-input':
        // Execute JavaScript to clear the input field
        const clearInputJs = `
          (function() {
            try {
              const activeElement = document.activeElement;
              if (!activeElement) return;

              if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
                activeElement.value = '';
                const event = new Event('input', { bubbles: true });
                activeElement.dispatchEvent(event);
              } else if (activeElement.isContentEditable) {
                activeElement.innerHTML = '';
                const event = new Event('input', { bubbles: true });
                activeElement.dispatchEvent(event);
              }
            } catch(e) {}
          })();
        `;
        webViewRef.current?.injectJavaScript(clearInputJs);
        break;

      // Page actions
      case 'reload-page':
        webViewRef.current?.reload();
        break;

      case 'view-page-source':
        // Get page source and display it
        webViewRef.current?.injectJavaScript(`
          (function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'pageSource',
              source: document.documentElement.outerHTML
            }));
          })();
        `);
        break;

      // Sharing actions
      case 'share-image':
        if (longPressData.src) {
          // Use enhanced ImageManager for image sharing
          await ImageManager.shareImage(longPressData.src, {
            showSuccessAlert: true,
            onError: (error) => {
              logger.error('Enhanced image sharing failed', error, { imageUrl: longPressData.src });
            }
          });
        }
        break;

      case 'share-video':
      case 'share-link':
      case 'share-text':
        const shareContent = longPressData.src || longPressData.href || longPressData.text || currentUrl;
        // Use React Native Share API
        try {
          const shareOptions = {
            message: shareContent.startsWith('http') ? `Check this out: ${shareContent}` : shareContent,
            url: shareContent.startsWith('http') ? shareContent : undefined,
            title: 'Share from Browser'
          };

          Share.share(shareOptions)
            .catch((error) => {
              logger.error('Error sharing content', error, { url: currentUrl });
              // Fallback to clipboard
              Clipboard.setString(shareContent);
            });
        } catch (error) {
          logger.error('Share error', error, { url: currentUrl });
          // Fallback to clipboard
          Clipboard.setString(shareContent);
        }
        break;
    }

    // Close the context menu after any action
    setContextMenuVisible(false);
  };
  // useBrowserStore destructured at the top


  // Register WebView instance with AppearanceManager and generate appearance scripts
  useEffect(() => {
    const handleAppearanceChange = (type: string, value: unknown) => {
      let script = '';

      if (type === 'fontSize' && typeof value === 'number') {
        script = AppearanceManager.generateFontSizeScript(value);
      } else if (type === 'pageZoom' && typeof value === 'number') {
        script = AppearanceManager.generatePageZoomScript(value);
      }

      if (script && webViewRef.current) {
        webViewRef.current.injectJavaScript(script);
      }
    };

    // Register the handler
    const unregister = AppearanceManager.registerWebViewInstance(handleAppearanceChange);

    // Cleanup on unmount
    return unregister;
  }, []);

  // Initialize the browser store and tabs on component mount
  useEffect(() => {
    const initializeBrowser = async () => {
      try {
        // Start a timer for minimum splash screen visibility (1.5s)
        const minDisplayTime = new Promise(resolve => setTimeout(resolve, 1500));

        await initialize();
        await loadTabs();

        // Check active tab and update state
        const activeTab = getActiveTab();
        if (activeTab) {
          const isHome = !activeTab.url || activeTab.url === 'about:blank';
          setUrl(activeTab.url);
          setIsHomePage(isHome);
        } else {
          setIsHomePage(true);
        }

        // Wait for both initialization and minimum display time
        await minDisplayTime;
        setIsInitialized(true);
      } catch (error) {
        logger.error('Failed to initialize browser', error);
        setIsInitialized(true); // Continue even if initialization fails
      }
    };

    initializeBrowser();
  }, [initialize, loadTabs, getActiveTab]);

  // Monitor changes in the active tab (including URL changes)
  const activeTab = getActiveTab();
  const activeTabUrl = activeTab?.url;

  useEffect(() => {
    // Only update URL from active tab if we are in browser mode
    // This prevents overwriting the home screen search bar input
    if (activeTab && !isHomePage && activeTab.url !== url) {
      setUrl(activeTab.url);
    }
  }, [activeTabUrl, isHomePage]);

  // Handle pending URL when screen gains focus (fixes tab restoration bug)
  useFocusEffect(
    useCallback(() => {
      const pendingUrl = getPendingUrlForActiveTab();

      // If we have a pending URL, we must switch to WebView mode regardless of current state
      if (pendingUrl) {
        // 1. Always switch UI to WebView mode first
        setIsHomePage(false);
        setUrl(pendingUrl);

        // 2. Handle URL loading logic
        if (webViewRef.current) {
          // If WebView is already mounted, we can check for equality to optimize
          // Only load if URL is different to preserve state
          if (pendingUrl !== currentUrl) {
            navigation.loadUrl(pendingUrl);
          }
        } else {
          // If WebView is NOT mounted (we were on Home Page), 
          // we MUST call loadUrl to update the hook's state (currentUrl)
          // so that when the WebView mounts in the next render, it has the correct URI.
          navigation.loadUrl(pendingUrl);
        }

        // 3. Clear pending state
        clearPendingUrlForActiveTab();
      }
    }, [navigation, getPendingUrlForActiveTab, clearPendingUrlForActiveTab, currentUrl])
  );

  // Navigation functions - defined before useEffect that uses them
  const goHome = () => {
    setIsHomePage(true);
    // Do NOT clear the WebView URL here. We want to keep the tab state alive in the background.
    // navigation.loadUrl(''); 
    setUrl('');
  };

  const goBack = () => {
    navigation.goBack();
  };

  const goForward = () => {
    navigation.goForward();
  };

  const openTabs = () => {
    router.push('/(tabs)/tabs');
  };

  // Handle hardware back button on Android
  useEffect(() => {
    const onBackPress = () => {
      if (showFindInPage) {
        toggleFindInPage();
        return true;
      }

      if (isMenuVisible) {
        setIsMenuVisible(false);
        return true;
      }

      if (contextMenuVisible) {
        setContextMenuVisible(false);
        return true;
      }

      if (searchContextMenuVisible) {
        setSearchContextMenuVisible(false);
        return true;
      }

      if (imagePreviewVisible) {
        setImagePreviewVisible(false);
        return true;
      }

      if (privacyPopupVisible) {
        setPrivacyPopupVisible(false);
        return true;
      }

      if (!isHomePage) {
        goBack();
        return true;
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      backHandler.remove();
    };
  }, [
    isHomePage,
    showFindInPage,
    isMenuVisible,
    contextMenuVisible,
    imagePreviewVisible,
    privacyPopupVisible,
    goBack
  ]);

  // Handle URL parameter from navigation
  useEffect(() => {
    // Check if there's a URL parameter from navigation
    if (params && params.url) {
      const urlToLoad = params.url as string;
      setUrl(urlToLoad);
      setIsHomePage(false);

      // Actually load the URL in the WebView
      // We need a slight delay to ensure the WebView is ready if we just switched from home page
      setTimeout(() => {
        navigation.loadUrl(urlToLoad);
      }, 100);

      // Clear the params to prevent re-loading on re-renders
      router.setParams({ url: undefined });
    }

    // Check if there's a view parameter (e.g. returning from tabs screen)
    if (params && params.view === 'browser') {
      setIsHomePage(false);
      // Clear the view param to prevent it from forcing browser view on subsequent renders
      router.setParams({ view: undefined });
    }
  }, [params]);

  // Find in page functionality
  const toggleFindInPage = (): void => {
    setShowFindInPage(!showFindInPage);
    if (showFindInPage) {
      clearFindInPage();
    }
  };
  const clearFindInPage = (): void => {
    const clearScript = `
      (function() {
        if (window.findInPage && window.findInPage.matches) {
          window.findInPage.matches.forEach(match => {
            try {
              const parent = match.parentNode;
              if (parent) {
                const text = document.createTextNode(match.textContent);
                parent.replaceChild(text, match);
                parent.normalize();
              }
            } catch (e) {}
          });
        }
        window.findInPage = {};
        // Also clear native selection just in case
        window.getSelection().removeAllRanges();
        return true;
      })();
    `;

    webViewRef.current?.injectJavaScript(clearScript);
    setFindText('');
    setFindMatches({ current: 0, total: 0 });
  };

  const findInPage = (text: string) => {
    if (!text || !webViewRef.current) return;

    // Use Optimized TreeWalker with chunking and DocumentFragment
    const findScript = `
      (function() {
        try {
          if (!window.findInPage) window.findInPage = {};
          
          // Helper for non-blocking execution
          const nextTick = window.requestIdleCallback || function(cb) { return setTimeout(cb, 1); };
          
          // Clear previous highlights
          if (window.findInPage.matches) {
             const fragment = document.createDocumentFragment();
             window.findInPage.matches.forEach(match => {
               try {
                 const parent = match.parentNode;
                 if (parent) {
                   const textNode = document.createTextNode(match.textContent);
                   parent.replaceChild(textNode, match);
                   parent.normalize();
                 }
               } catch (e) {}
             });
          }
          
          window.findInPage.matches = [];
          window.findInPage.currentIndex = -1;
          window.findInPage.searchText = ${JSON.stringify(text)};
          
          const searchText = ${JSON.stringify(text)}.toLowerCase();
          if (!searchText) return;
          
          const matches = [];
          const matchLimit = 1000;
          
          const treeWalker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: function(node) {
                if (!node.parentElement) return NodeFilter.FILTER_REJECT;
                const tagName = node.parentElement.tagName;
                if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT'].includes(tagName)) return NodeFilter.FILTER_REJECT;
                if (node.parentElement.isContentEditable) return NodeFilter.FILTER_REJECT;
                const style = window.getComputedStyle(node.parentElement);
                if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
              }
            }
          );

          let currentNode;
          const textNodes = [];
          
          // Phase 1: Collect text nodes in chunks to avoid blocking
          function collectNodes() {
            let count = 0;
            while ((currentNode = treeWalker.nextNode()) && count < 200) {
              if (currentNode.textContent.toLowerCase().includes(searchText)) {
                textNodes.push(currentNode);
              }
              count++;
            }
            
            if (currentNode) {
              nextTick(collectNodes);
            } else {
              processNodes(0);
            }
          }
          
          // Phase 2: Process and highlight nodes in batches
          function processNodes(startIndex) {
            const batchSize = 50;
            const endIndex = Math.min(startIndex + batchSize, textNodes.length);
            
            for (let i = startIndex; i < endIndex && matches.length < matchLimit; i++) {
              const node = textNodes[i];
              const content = node.textContent;
              const lowerContent = content.toLowerCase();
              let searchIndex = lowerContent.indexOf(searchText);
              
              if (searchIndex >= 0) {
                try {
                  const matchNode = node.splitText(searchIndex);
                  matchNode.splitText(searchText.length);
                  
                  const highlight = document.createElement('span');
                  highlight.style.backgroundColor = '#ffeb3b';
                  highlight.style.color = '#000000';
                  highlight.className = 'aura-search-highlight';
                  highlight.id = 'aura-match-' + matches.length;
                  
                  node.parentNode.insertBefore(highlight, matchNode);
                  highlight.appendChild(matchNode);
                  matches.push(highlight);
                } catch (e) {}
              }
            }
            
            if (endIndex < textNodes.length && matches.length < matchLimit) {
              nextTick(() => processNodes(endIndex));
            } else {
              finalizeResults();
            }
          }
          
          function finalizeResults() {
            window.findInPage.matches = matches;
            
            if (matches.length > 0) {
              window.findInPage.currentIndex = 0;
              const firstMatch = matches[0];
              firstMatch.style.backgroundColor = '#ff9800';
              
              requestAnimationFrame(() => {
                firstMatch.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center'
                });
              });
            }
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'findMatches',
              data: {
                current: matches.length > 0 ? 1 : 0,
                total: matches.length
              }
            }));
          }
          
          collectNodes();
          
        } catch (err) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'findMatches',
            data: { current: 0, total: 0 }
          }));
        }
      })();
    `;

    webViewRef.current.injectJavaScript(findScript);
  };

  const findNext = (): void => {
    if (!webViewRef.current) return;

    const nextScript = `
      (function() {
        try {
          if (!window.findInPage || !window.findInPage.matches || window.findInPage.matches.length === 0) {
            return;
          }
          
          const matches = window.findInPage.matches;
          let currentIndex = window.findInPage.currentIndex;
          
          // Reset current highlight
          if (currentIndex >= 0 && currentIndex < matches.length) {
            matches[currentIndex].style.backgroundColor = '#ffeb3b';
          }
          
          // Move to next
          currentIndex = (currentIndex + 1) % matches.length;
          window.findInPage.currentIndex = currentIndex;
          
          // Highlight new current
          const newMatch = matches[currentIndex];
          newMatch.style.backgroundColor = '#ff9800';
          newMatch.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'findMatches',
            data: {
              current: currentIndex + 1,
              total: matches.length
            }
          }));
        } catch (e) {}
      })();
    `;

    webViewRef.current.injectJavaScript(nextScript);
  };

  const findPrevious = (): void => {
    if (!webViewRef.current) return;

    const prevScript = `
      (function() {
        try {
          if (!window.findInPage || !window.findInPage.matches || window.findInPage.matches.length === 0) {
            return;
          }
          
          const matches = window.findInPage.matches;
          let currentIndex = window.findInPage.currentIndex;
          
          // Reset current highlight
          if (currentIndex >= 0 && currentIndex < matches.length) {
            matches[currentIndex].style.backgroundColor = '#ffeb3b';
          }
          
          // Move to previous
          currentIndex = (currentIndex - 1 + matches.length) % matches.length;
          window.findInPage.currentIndex = currentIndex;
          
          // Highlight new current
          const newMatch = matches[currentIndex];
          newMatch.style.backgroundColor = '#ff9800';
          newMatch.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'findMatches',
            data: {
              current: currentIndex + 1,
              total: matches.length
            }
          }));
        } catch (e) {}
      })();
    `;

    webViewRef.current.injectJavaScript(prevScript);
  };


  const handleSearch = () => {
    if (!url.trim()) return;

    const searchEngine = settings?.searchEngine || 'google';
    
    // Use normalizeURL to correctly handle search queries vs URLs
    // This fixes the issue where plain text was treated as a URL on iOS
    const validation = URLValidator.normalizeURL(url, searchEngine);
    const searchUrl = validation.sanitizedUrl;

    setUrl(searchUrl);
    setIsHomePage(false);

    // IMPORTANT: Actually load the URL in the WebView
    navigation.loadUrl(searchUrl);

    // Add to history
    addToHistory({
      title: url.includes('.') && !url.includes(' ') ? url : `Search: ${url}`,
      url: searchUrl,
    });
  };

  const handleUrlSubmit = () => {
    handleSearch();
    setIsEditingUrl(false);
    Keyboard.dismiss();
  };

  const handleUrlBlur = () => {
    setIsEditingUrl(false);
  };

  const handleCopyToClipboard = () => {
    if (url) {
      Clipboard.setString(url);
      Alert.alert('Success', 'URL copied to clipboard');
    }
  };

  // Handle search bar long press to show context menu
  const handleSearchBarLongPress = useCallback((event: { nativeEvent: { pageX: number, pageY: number } }) => {
    const { pageX, pageY } = event.nativeEvent;

    // Position context menu slightly below the touch point
    setSearchContextMenuPosition({ x: pageX, y: pageY + 10 });

    const menuItems: ContextMenuItem[] = [];
    const isUrl = URLValidator.validate(url).isValid;

    // Copy Text
    if (url && url.trim()) {
      menuItems.push({
        id: 'copy-text',
        icon: 'copy-outline',
        title: 'Copy Text',
        onPress: () => handleSearchContextMenuItemPress('copy-text')
      });

      menuItems.push({
        id: 'share-text',
        icon: 'share-outline',
        title: 'Share',
        onPress: () => handleSearchContextMenuItemPress('share-text')
      });
    }

    // Paste Text
    menuItems.push({
      id: 'paste-text',
      icon: 'clipboard-outline',
      title: 'Paste',
      onPress: () => handleSearchContextMenuItemPress('paste-text')
    });

    if (url && url.trim()) {
      // Search
      menuItems.push({
        id: 'search-engine',
        icon: 'search-outline',
        title: `Search ${settings?.searchEngine === 'google' ? 'Google' : 'Web'}`,
        onPress: () => handleSearchContextMenuItemPress('search-engine')
      });

      // Open in New Tab (if URL)
      if (isUrl) {
        menuItems.push({
          id: 'open-new-tab',
          icon: 'add-circle-outline',
          title: 'Open in New Tab',
          onPress: () => handleSearchContextMenuItemPress('open-new-tab')
        });

        menuItems.push({
          id: 'open-incognito',
          icon: 'eye-off-outline',
          title: 'Open in Incognito',
          onPress: () => handleSearchContextMenuItemPress('open-incognito')
        });

        menuItems.push({
          id: 'add-bookmark',
          icon: 'bookmark-outline',
          title: 'Add to Bookmark',
          onPress: () => handleSearchContextMenuItemPress('add-bookmark')
        });
      }

      // Clear Text
      menuItems.push({
        id: 'clear-text',
        icon: 'trash-outline',
        title: 'Clear Text',
        onPress: () => handleSearchContextMenuItemPress('clear-text')
      });
    }

    if (menuItems.length > 0) {
      setSearchContextMenuItems(menuItems);
      setSearchContextMenuVisible(true);
    }
  }, [url, settings?.searchEngine]);

  // Handle search bar context menu item selection
  const handleSearchContextMenuItemPress = async (itemId: string) => {
    switch (itemId) {
      case 'copy-text':
        if (url) {
          Clipboard.setString(url);
        }
        break;

      case 'share-text':
        if (url) {
          try {
            await Share.share({
              message: url,
            });
          } catch (error) {
            logger.error('Error sharing search text', error);
          }
        }
        break;

      case 'paste-text':
        try {
          const content = await Clipboard.getString();
          if (content) {
            setUrl(content);
          }
        } catch (error) {
          logger.error('Error pasting text', error);
        }
        break;

      case 'search-engine':
        handleSearch();
        break;

      case 'open-new-tab':
        if (url) {
          createNewTab(url);
          setIsHomePage(false);
          navigation.loadUrl(url);
        }
        break;

      case 'open-incognito':
        if (url) {
          createPrivacyTab(url);
          setIsHomePage(false);
          navigation.loadUrl(url);
        }
        break;

      case 'add-bookmark':
        if (url) {
          try {
            await addBookmark({
              url: url,
              title: url,
              folder: 'default'
            });
            Alert.alert('Success', 'Added to bookmarks');
          } catch (error) {
            logger.error('Error adding bookmark', error);
          }
        }
        break;

      case 'clear-text':
        setUrl('');
        break;
    }
    setSearchContextMenuVisible(false);
  };


  // This function is now handled by the handleWebViewMessage defined earlier
  // Removing duplicate definition to fix the error
  // Note: There was a duplicate handleWebViewMessage function here that was causing compilation errors
  // Handle download requests
  const handleDownloadRequest = async (event: FileDownloadEvent | { nativeEvent: { url: string } }) => {
    let downloadUrl: string;

    // Handle both types: FileDownloadEvent has nativeEvent with downloadUrl, fallback has url
    if ('downloadUrl' in event.nativeEvent) {
      downloadUrl = (event.nativeEvent as FileDownloadEvent & { downloadUrl: string }).downloadUrl;
    } else {
      downloadUrl = (event.nativeEvent as { url: string }).url;
    }

    try {
      await DownloadManager.downloadFromWebView(downloadUrl);
    } catch (error) {
      logger.error('Download failed', error, { url: downloadUrl });
      Alert.alert('Download Error', 'Failed to start download');
    }
  };

  // Create new tab
  const handleCreateNewTab = () => {
    // Get default homepage URL based on selected search engine
    const searchEngine = settings?.searchEngine || 'google';
    let homepageUrl = 'https://www.google.com';

    // Map search engine to homepage URL
    const engineHomepages = {
      google: 'https://www.google.com',
      bing: 'https://www.bing.com',
      duckduckgo: 'https://duckduckgo.com',
      yahoo: 'https://www.yahoo.com',
      ecosia: 'https://www.ecosia.org',
    };

    // Use the appropriate homepage URL based on selected search engine
    if (engineHomepages[searchEngine as keyof typeof engineHomepages]) {
      homepageUrl = engineHomepages[searchEngine as keyof typeof engineHomepages];
    } else if (searchEngine.includes('://')) {
      // Handle custom search engine - extract the base URL
      try {
        const url = new URL(searchEngine.split('{searchTerms}')[0].split('%s')[0]);
        homepageUrl = url.origin;
      } catch (error) {
        logger.error('Error parsing custom search engine URL', error);
      }
    }

    const newTabId = createTabForCurrentMode(homepageUrl);
    setUrl(homepageUrl);
    setIsHomePage(false);
  };





  // Night Mode Manager instance
  const nightModeManager = NightModeManager.getInstance();

  const desktopUserAgent = getDesktopUserAgent();
  const mobileUserAgent = getMobileUserAgent();



  // Handle night mode changes with NightModeManager (WebView 3.0)
  useEffect(() => {
    if (webViewRef.current && currentUrl && !isHomePage) {
      nightModeManager.updateConfig({
        enabled: nightMode,
        url: currentUrl,
        isIncognito: incognitoMode,
      });

      if (nightMode) {
        const nightModeCSS = nightModeManager.getNightModeCSS(currentUrl);
        webViewRef.current.injectJavaScript(nightModeCSS);
      } else {
        const removeNightModeCSS = nightModeManager.getRemoveNightModeCSS();
        webViewRef.current.injectJavaScript(removeNightModeCSS);
      }
    }
  }, [nightMode, currentUrl, incognitoMode]);

  // Handle desktop mode changes by reloading the page
  useEffect(() => {
    if (webViewRef.current && currentUrl && !isHomePage) {
      webViewRef.current.reload();
    }
  }, [desktopMode]);



  // Get theme colors based on night mode and incognito mode
  const themeColors = getThemeColors(nightMode, incognitoMode);
  const gradientColors = themeColors.gradient;
  const topBarColor = themeColors.topBar;

  // Animated colors interpolation for top bar
  const topBarBackgroundColor = topBarAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [topBarColor, '#ffffff'],
  });

  // Animated colors interpolation for bottom bar
  const bottomBarBackgroundColor = bottomBarAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [topBarColor, '#ffffff'],
  });

  // Animated scale for professional effect
  const scaleValue = scaleAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.98],
  });

  // Dynamic gradient colors that change in browsing mode
  const currentGradientColors = !nightMode && !incognitoMode && !isHomePage
    ? ['#ffffff', '#ffffff'] as [string, string]
    : gradientColors;

  // Professional animation for bar color transition in normal mode only
  useEffect(() => {
    if (!nightMode && !incognitoMode && !isHomePage) {
      // Animate to white theme FAST when browsing in normal mode
      Animated.parallel([
        Animated.timing(topBarAnimatedValue, {
          toValue: 1,
          duration: 150, // Much faster duration
          easing: Easing.out(Easing.quad), // Snappier easing
          useNativeDriver: false,
        }),
        Animated.timing(bottomBarAnimatedValue, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnimatedValue, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // Reset animation to original colors fast
      Animated.parallel([
        Animated.timing(topBarAnimatedValue, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(bottomBarAnimatedValue, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnimatedValue, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [nightMode, incognitoMode, isHomePage, topBarAnimatedValue, bottomBarAnimatedValue, scaleAnimatedValue]);

  // Effect for incognito mode - clear storage on page load
  useEffect(() => {
    if (incognitoMode && webViewRef.current && currentUrl && !isHomePage) {
      // Apply incognito mode to webview - clear cookies and storage
      webViewRef.current.injectJavaScript(`
        (function() {
          // Clear cookies and storage for incognito mode
          document.cookie.split(';').forEach(function(c) {
            document.cookie = c.trim().split('=')[0] + '=;' + 'expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
          });
          localStorage.clear();
          sessionStorage.clear();
          return true;
        })();
      `);
    }
  }, [incognitoMode, currentUrl, isHomePage]);

  // Show loading screen while initializing
  if (!isInitialized) {
    return <WelcomeScreen />;
  }

  return (
    <LinearGradient colors={currentGradientColors} style={styles.container}>
      <StatusBar barStyle={!nightMode && !incognitoMode && !isHomePage ? "dark-content" : "light-content"} />
      <View style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
        {/* Top Bar - Conditionally Rendered */}
        {isHomePage ? (
          /* Home Top Bar */
          <View style={[styles.topBar, { backgroundColor: topBarColor, paddingTop: statusBarHeight + dimensions.responsiveSpacing(8) }]}>
            <TouchableOpacity
              style={styles.topButton}
              onPress={() => {
                try {
                  webViewRef.current?.reload();
                } catch (error) {
                  logger.warn('Page reload error', error as any);
                }
              }}
            >
              <Ionicons
                name="refresh-outline"
                size={24}
                color="#ffffff"
              />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <FluxoLogo incognitoMode={incognitoMode} nightMode={nightMode} />
              {incognitoMode && (
                <View style={styles.modeIndicator}>
                  <Ionicons name="eye-off" size={14} color="#ff6b6b" />
                  <Text style={styles.incognitoLabel}>Incognito</Text>
                </View>
              )}
              {nightMode && !incognitoMode && (
                <View style={styles.modeIndicator}>
                  <Ionicons name="moon" size={14} color="#f5a623" />
                  <Text style={styles.nightModeLabel}>Night Mode</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.topButton}
              onPress={handleCreateNewTab}
            >
              <Ionicons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          /* Browser Top Bar */
          <Animated.View style={[styles.topBar, { backgroundColor: topBarBackgroundColor, paddingTop: statusBarHeight + dimensions.responsiveSpacing(8), transform: [{ scale: scaleValue }] }]}>
            <TouchableOpacity
              style={styles.topButton}
              onPress={() => {
                try {
                  webViewRef.current?.reload();
                } catch (error) {
                  logger.warn('Page reload error', error as any);
                }
              }}
            >
              <Ionicons
                name="refresh-outline"
                size={24}
                color={!nightMode && !incognitoMode && !isHomePage ? '#1a1b3a' : '#ffffff'}
              />
            </TouchableOpacity>

            <View style={styles.urlContainer}>
              {/* Beautiful Animated AdBlock Indicator - Shows when not on homepage */}
              {!isHomePage && (
                <View style={styles.adBlockIndicator}>
                  <AnimatedAdBlockIcon
                    isEnabled={isAdBlockEnabled}
                    blockedCount={adBlocker.stats.currentPage.adsBlocked}
                    onToggle={() => {
                      // Open Privacy Shield Popup instead of direct toggle
                      setPrivacyPopupVisible(true);
                    }}
                    size={20}
                  />
                </View>
              )}
              {!isHomePage && !isEditingUrl ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsEditingUrl(true)}
                  onLongPress={handleCopyToClipboard}
                  style={[
                    styles.urlInput,
                    { paddingLeft: 44, justifyContent: 'center' },
                    !nightMode && !incognitoMode && styles.urlInputBrowsingMode
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons
                      name={url.startsWith('https') ? 'lock-closed' : 'globe-outline'}
                      size={14}
                      color={!nightMode && !incognitoMode ? '#1a1b3a' : '#ffffff'}
                      style={{ marginRight: 6 }}
                    />
                    <Text numberOfLines={1} style={{ flex: 1 }}>
                      <Text style={[
                        styles.urlDisplayText,
                        styles.domainText,
                        !nightMode && !incognitoMode && { color: '#1a1b3a' }
                      ]}>
                        {URLValidator.getDisplayURLParts(url).domain}
                      </Text>
                      <Text style={[
                        styles.urlDisplayText,
                        styles.pathText,
                        !nightMode && !incognitoMode && { color: 'rgba(26, 27, 58, 0.6)' }
                      ]}>
                        {URLValidator.getDisplayURLParts(url).path}
                      </Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TextInput
                  ref={urlInputRef}
                  style={[styles.urlInput, !isHomePage && { paddingLeft: 44 }, !nightMode && !incognitoMode && !isHomePage && styles.urlInputBrowsingMode]}
                  value={url}
                  onChangeText={setUrl}
                  onBlur={handleUrlBlur}
                  autoFocus={!isHomePage && isEditingUrl}
                  onSubmitEditing={handleUrlSubmit}
                  placeholder={`Search ${settings?.searchEngine === 'google' ? 'Google' :
                    settings?.searchEngine === 'bing' ? 'Bing' :
                      settings?.searchEngine === 'duckduckgo' ? 'DuckDuckGo' :
                        settings?.searchEngine === 'yahoo' ? 'Yahoo' :
                          settings?.searchEngine === 'ecosia' ? 'Ecosia' : 'the web'} or type a URL`}
                  placeholderTextColor="#888"
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectTextOnFocus={true}
                />
              )}
            </View>

            <TouchableOpacity
              style={styles.topButton}
              onPress={handleCreateNewTab}
            >
              <Ionicons name="add" size={24} color={!nightMode && !incognitoMode && !isHomePage ? '#1a1b3a' : '#ffffff'} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Content Area - Stacked */}
        <View style={{ flex: 1 }}>
          {/* Home Content */}
          {isHomePage && (
            <ScrollView style={[styles.content, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]} showsVerticalScrollIndicator={false}>
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <TouchableOpacity
                  activeOpacity={1}
                  onLongPress={handleSearchBarLongPress}
                  delayLongPress={500}
                >
                  <View style={styles.searchBar}>
                    <View style={styles.searchIcon}>
                      <GoogleIcon size={26} />
                    </View>
                    <TextInput
                      style={styles.searchInput}
                      placeholder={`Search ${settings?.searchEngine === 'google' ? 'Google' :
                        settings?.searchEngine === 'bing' ? 'Bing' :
                          settings?.searchEngine === 'duckduckgo' ? 'DuckDuckGo' :
                            settings?.searchEngine === 'yahoo' ? 'Yahoo' :
                              settings?.searchEngine === 'ecosia' ? 'Ecosia' : 'the web'} or type a URL`}
                      placeholderTextColor="#888"
                      value={url}
                      onChangeText={setUrl}
                      onSubmitEditing={handleSearch}
                      blurOnSubmit={false}
                      enablesReturnKeyAutomatically={true}
                      returnKeyType="search"
                      autoCapitalize="none"
                      autoCorrect={false}
                      spellCheck={false}
                      contextMenuHidden={true}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Market Data */}
              <CurrencyWidget />

              {/* Quick Access */}
              <QuickAccessGrid onSitePress={(siteUrl) => {
                setUrl(siteUrl);
                setIsHomePage(false);
                navigation.loadUrl(siteUrl);
              }} />
            </ScrollView>
          )}

          {/* WebView Content - Always Mounted, Hidden if Home */}
          <View style={[styles.webviewContainer, isHomePage && { display: 'none' }]}>
            <ErrorBoundary>
              {/* Loading Progress Bar */}
              {isLoading && progress < 100 && (
                <Animated.View style={styles.progressBarContainer}>
                  <Animated.View
                    style={[
                      styles.progressBar,
                      { width: `${progress}%` }
                    ]}
                  />
                </Animated.View>
              )}

              {/* Find in page bar */}
              {Boolean(showFindInPage) && (
                <View style={styles.findInPageContainer}>
                  <TextInput
                    style={styles.findInput}
                    value={findText}
                    onChangeText={(text) => {
                      setFindText(text);
                      if (text) findInPage(text);
                    }}
                    placeholder="Find in page"
                    placeholderTextColor="#999"
                    autoFocus
                    returnKeyType="search"
                    onSubmitEditing={() => findInPage(findText)}
                  />
                  <Text style={styles.findCounter}>
                    {findMatches.total > 0 ? `${findMatches.current}/${findMatches.total}` : 'No matches'}
                  </Text>
                  <TouchableOpacity onPress={() => findPrevious()} style={styles.findButton}>
                    <Ionicons name="chevron-up" size={responsiveIconSize(20)} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => findNext()} style={styles.findButton}>
                    <Ionicons name="chevron-down" size={responsiveIconSize(20)} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleFindInPage()} style={styles.findButton}>
                    <Ionicons name="close" size={responsiveIconSize(20)} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Wrap WebView in View for screenshot capture */}
              <View
                ref={webViewContainerRef}
                style={styles.webview}
                collapsable={false}
              >
                {/* Normal Tabs */}
                {tabs.map((tab) => {
                  const isActive = !incognitoMode && tab.id === activeTabId;
                  return (
                    <TabWebView
                      key={tab.id}
                      ref={(ref) => {
                        if (ref) tabRefs.current[tab.id] = ref;
                        else delete tabRefs.current[tab.id];
                      }}
                      tab={tab}
                      isActive={isActive}
                      isIncognito={false}
                      isHomePage={isHomePage}
                      onStateChange={handleTabStateChange}
                      onFileDownload={handleDownloadRequest}
                      onLongPress={handleLongPress}
                      onFindMatches={setFindMatches}
                      onLoadEnd={handleTabLoadEnd}
                      userAgent={desktopMode ? desktopUserAgent : mobileUserAgent}
                      textZoom={textZoom}
                      nightMode={nightMode}
                    />
                  );
                })}

                {/* Privacy Tabs */}
                {privacyTabs.map((tab) => {
                  const isActive = incognitoMode && tab.id === activePrivacyTabId;
                  return (
                    <TabWebView
                      key={tab.id}
                      ref={(ref) => {
                        if (ref) tabRefs.current[tab.id] = ref;
                        else delete tabRefs.current[tab.id];
                      }}
                      tab={tab}
                      isActive={isActive}
                      isIncognito={true}
                      isHomePage={isHomePage}
                      onStateChange={handleTabStateChange}
                      onFileDownload={handleDownloadRequest}
                      onLongPress={handleLongPress}
                      onLoadEnd={handleTabLoadEnd}
                      userAgent={desktopMode ? desktopUserAgent : mobileUserAgent}
                      textZoom={textZoom}
                      nightMode={nightMode}
                    />
                  );
                })}
              </View>

              {/* WebView Error View */}
              {error && (
                <WebViewErrorView
                  error={error}
                  onReload={() => navigation.reload()}
                  onGoBack={goBack}
                  onSwitchSearchEngine={() => {
                    const store = useBrowserStore.getState();
                    const currentEngine = store.settings.searchEngine;
                    const nextEngine = currentEngine === 'google' ? 'duckduckgo' : 'google';
                    store.updateSetting('searchEngine', nextEngine);

                    // Reload with new search engine if it was a search
                    if (currentUrl?.includes('google.com/search')) {
                      const query = new URL(currentUrl).searchParams.get('q');
                      if (query) {
                        const newUrl = nextEngine === 'duckduckgo'
                          ? `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
                          : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                        navigation.loadUrl(newUrl);
                      } else {
                        goHome();
                      }
                    } else {
                      goHome();
                    }
                  }}
                />
              )}

              {/* Context Menu */}
              <ContextMenu
                visible={contextMenuVisible}
                position={contextMenuPosition}
                menuItems={contextMenuItems}
                onClose={() => setContextMenuVisible(false)}
              />

              {/* Search Bar Context Menu */}
              <ContextMenu
                visible={searchContextMenuVisible}
                position={searchContextMenuPosition}
                menuItems={searchContextMenuItems}
                onClose={() => setSearchContextMenuVisible(false)}
              />
            </ErrorBoundary>
          </View>
        </View>

        {/* Bottom Navigation */}
        <BottomNavigation
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onBack={goBack}
          onForward={goForward}
          onHome={goHome}
          onTabs={openTabs}
          onMenu={() => {
            // FIXED: Removed debug console.log for production
            setIsMenuVisible(true);
          }}
          isHomePage={isHomePage}
          nightMode={nightMode}
          incognitoMode={incognitoMode}
          isMenuModalOpen={isMenuVisible || privacyPopupVisible}
          hidden={imagePreviewVisible}
          animatedBackgroundColor={bottomBarBackgroundColor}
        />
      </View>

      <MenuModal
        visible={isMenuVisible}
        onClose={() => setIsMenuVisible(false)}
        currentUrl={currentUrl}
        onFindInPage={toggleFindInPage}
        isBrowsingMode={!nightMode && !incognitoMode && !isHomePage}
      />

      {/* Enhanced Image Preview Modal */}
      <ImagePreviewModal
        visible={imagePreviewVisible}
        imageUrl={previewImageUrl}
        key={previewImageUrl || 'image-preview-modal'}
        onClose={() => {
          setImagePreviewVisible(false);
          setPreviewImageUrl('');
        }}
        onOpenInNewTab={(url) => {
          createNewTab(url);
        }}
      />

      {/* Privacy Shield Popup */}
      <PrivacyShieldPopup
        visible={privacyPopupVisible}
        onClose={() => setPrivacyPopupVisible(false)}
        currentUrl={currentUrl}
        onViewReport={() => {
          setPrivacyPopupVisible(false);
          router.push('/(tabs)/adBlocker');
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  findInPageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: responsiveSpacing(10),
    paddingVertical: responsiveSpacing(8),
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    elevation: 2,
  },
  findInput: {
    flex: 1,
    height: responsiveHeight(36),
    backgroundColor: '#fff',
    borderRadius: responsiveBorderRadius(18),
    paddingHorizontal: responsiveSpacing(15),
    marginRight: responsiveSpacing(10),
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: responsiveFontSize(14),
  },
  findCounter: {
    marginRight: responsiveSpacing(10),
    fontSize: responsiveFontSize(14),
    color: '#666',
  },
  findButton: {
    padding: responsiveSpacing(5),
    marginLeft: responsiveSpacing(5),
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsiveSpacing(isSmallScreen() ? 12 : 16),
    paddingVertical: responsiveSpacing(isSmallScreen() ? 8 : 12),
    backgroundColor: 'rgba(26, 27, 58, 0.9)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    minHeight: responsiveHeight(isSmallScreen() ? 70 : 80),
  },
  topButton: {
    width: responsiveWidth(isSmallScreen() ? 38 : 44),
    height: responsiveHeight(isSmallScreen() ? 38 : 44),
    borderRadius: responsiveBorderRadius(isSmallScreen() ? 19 : 22),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  incognitoButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: responsiveFontSize(isSmallScreen() ? 20 : 24),
    fontWeight: 'bold',
    color: '#ffffff',
    // FIXED: Removed unsupported textShadow property
    // Text shadow not supported in React Native - using elevation instead
  },
  incognitoText: {
    color: '#ff6b6b',
  },
  nightModeText: {
    color: '#f5a623',
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: responsiveSpacing(2),
    gap: 4,
  },
  incognitoLabel: {
    fontSize: responsiveFontSize(isSmallScreen() ? 8 : 10),
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: responsiveSpacing(2),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nightModeLabel: {
    fontSize: responsiveFontSize(isSmallScreen() ? 8 : 10),
    color: '#f5a623',
    textAlign: 'center',
    marginTop: responsiveSpacing(2),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  urlContainer: {
    flex: 1,
    marginHorizontal: responsiveSpacing(isSmallScreen() ? 6 : 10),
    position: 'relative',
    minWidth: 0,
  },
  adBlockIndicator: {
    position: 'absolute',
    left: responsiveSpacing(4),
    top: '50%',
    transform: [{ translateY: -18 }],
    zIndex: 10,
  },
  urlInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: responsiveBorderRadius(20),
    paddingHorizontal: responsiveSpacing(isSmallScreen() ? 12 : 16),
    paddingVertical: responsiveSpacing(isSmallScreen() ? 6 : 8),
    color: '#ffffff',
    fontSize: responsiveFontSize(isSmallScreen() ? 14 : 16),
    minHeight: responsiveHeight(isSmallScreen() ? 36 : 40),
    height: responsiveHeight(isSmallScreen() ? 38 : 42),
  },
  urlInputBrowsingMode: {
    backgroundColor: 'rgba(26, 27, 58, 0.08)',
    color: '#1a1b3a',
  },
  urlDisplayText: {
    fontSize: responsiveFontSize(isSmallScreen() ? 14 : 16),
  },
  domainText: {
    fontWeight: '700',
    color: '#ffffff',
  },
  pathText: {
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    padding: responsiveSpacing(isSmallScreen() ? 16 : 20),
  },
  searchBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: responsiveBorderRadius(25),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsiveSpacing(isSmallScreen() ? 12 : 16),
    paddingVertical: responsiveSpacing(isSmallScreen() ? 10 : 12),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: responsiveHeight(isSmallScreen() ? 44 : 48),
  },
  searchIcon: {
    marginRight: responsiveSpacing(16),
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: responsiveFontSize(isSmallScreen() ? 14 : 16),
    paddingLeft: responsiveSpacing(8),
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4285f4',
  },
});

export default BrowserScreen;
