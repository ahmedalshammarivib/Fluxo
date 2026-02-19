/**
 * useWebView - Custom hook for WebView functionality
 * 
 * Centralizes WebView logic including:
 * - Navigation management
 * - Ad blocking
 * - Privacy features
 * - History management
 * - Downloads
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { WebView, WebViewNavigation, WebViewMessageEvent } from 'react-native-webview';
import { 
  WebViewProgressEvent, 
  WebViewError, 
  WebViewHttpErrorEvent, 
  ShouldStartLoadRequest 
} from 'react-native-webview/lib/WebViewTypes';
import { BackHandler, Platform } from 'react-native';
import { useBrowserStore } from '@/store/browserStore';
import { WebViewScriptManager } from '@/utils/webViewScriptManager';
import { URLValidator } from '@/utils/urlValidator';
import { WebViewPerformanceMonitor } from '@/utils/webViewPerformanceMonitor';
import { logger } from '@/utils/logger';
import { rateLimiter } from '@/utils/rateLimiter';
import { rafThrottle, debounce, batch } from '@/utils/performanceHelpers';

export interface AdBlockStats {
  adsBlocked: number;
  trackersBlocked: number;
  totalAdsBlocked: number;
  totalTrackersBlocked: number;
  domain?: string;
}

export interface WebViewState {
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  progress: number;
  currentUrl: string;
  error: unknown;
}

export interface UseWebViewProps {
  isHomePage?: boolean;
  onGoHome?: () => void;
  onAdBlockStats?: (stats: AdBlockStats) => void;
  tabId?: string;
  isIncognito?: boolean;
  isActive?: boolean;
}

export const useWebView = (props: UseWebViewProps = {}) => {
  const { isHomePage = false, onGoHome, onAdBlockStats, tabId, isIncognito: propIncognito, isActive = true } = props;
  const webViewRef = useRef<WebView>(null);
  const scriptManager = WebViewScriptManager.getInstance();
  const perfMonitor = WebViewPerformanceMonitor.getInstance();
  const retryCountRef = useRef(0);
  
  // Track previous stats to calculate deltas
  const previousStatsRef = useRef<{ adsBlocked: number; trackersBlocked: number }>({ adsBlocked: 0, trackersBlocked: 0 });

  const [webViewState, setWebViewState] = useState<WebViewState>({
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    progress: 0,
    currentUrl: '',
    error: null,
  });

  const {
    nightMode,
    incognitoMode: storeIncognitoMode,
    isAdBlockEnabled,
    adBlocker,
    addToHistory,
    updateTabUrl,
    updateTabTitle,
    tabs,
    activeTabId,
    privacyTabs,
    activePrivacyTabId,
    updatePrivacyTabUrl,
    updatePrivacyTabTitle,
    updateCurrentDomain,
    settings,
    clearPendingUrlForActiveTab,
    getPendingUrlForActiveTab,
  } = useBrowserStore();

  // Determine effective incognito mode
  const isIncognito = propIncognito ?? storeIncognitoMode;

  // Memoize settings to prevent unnecessary updates
  const webViewSettings = useMemo(() => ({
    adBlockEnabled: isAdBlockEnabled,
    trackingProtection: adBlocker.features.trackingProtection,
    locationPrivacy: adBlocker.features.locationPrivacy,
    nightMode,
  }), [isAdBlockEnabled, adBlocker.features.trackingProtection, adBlocker.features.locationPrivacy, nightMode]);

  /**
   * Get active tab helper
   */
  const getActiveTab = useCallback(() => {
    const store = useBrowserStore.getState();
    // If tabId is provided, find that specific tab
    if (tabId) {
      if (isIncognito) {
        return store.privacyTabs.find(tab => tab.id === tabId);
      }
      return store.tabs.find(tab => tab.id === tabId);
    }
    
    // Fallback to global active tab (legacy behavior)
    if (store.incognitoMode) {
      return store.privacyTabs.find(tab => tab.id === store.activePrivacyTabId);
    }
    return store.tabs.find(tab => tab.id === store.activeTabId);
  }, [tabId, isIncognito]);

  /**
   * Update script manager settings and generate scripts
   * usage of useMemo ensures settings are updated before scripts are generated
   */
  const scripts = useMemo(() => {
    scriptManager.updateSettings(webViewSettings);
    return {
      preloadScript: scriptManager.getPreloadScript(),
      postLoadScript: scriptManager.getPostLoadScript(),
    };
  }, [webViewSettings]);

  /**
   * Monitor active tab changes and update currentUrl accordingly
   */
  useEffect(() => {
    const activeTab = getActiveTab();
    if (activeTab && activeTab.url && activeTab.url !== webViewState.currentUrl) {
      setWebViewState(prev => ({
        ...prev,
        currentUrl: activeTab.url,
        isLoading: true,
        progress: 0,
      }));
      perfMonitor.startPageLoad(activeTab.url);
    }
  }, [tabs, privacyTabs, tabId, isIncognito, getActiveTab]); // Updated dependencies to track specific tab changes

  /**
   * Handle WebView navigation state changes
   */
  const handleNavigationStateChange = useCallback(
    debounce(((navState: WebViewNavigation) => {
      const { url, loading, canGoBack, canGoForward } = navState;

      // Update current domain in store as soon as URL changes
      // This resets current page counters if domain is different
      if (url && url !== 'about:blank') {
        // Only update global domain if this is the active tab
        if (isActive) {
          updateCurrentDomain(url);
        }
        
        // If domain changed, also reset our local reference for delta calculations
        // To be safe, we can reset the reference when loading starts for a new URL
        if (loading && url !== webViewState.currentUrl) {
          previousStatsRef.current = { adsBlocked: 0, trackersBlocked: 0 };
        }
      }

      // Only update state if values actually changed
      const stateChanged = 
        loading !== webViewState.isLoading ||
        canGoBack !== webViewState.canGoBack ||
        canGoForward !== webViewState.canGoForward ||
        url !== webViewState.currentUrl;

      if (stateChanged) {
        setWebViewState(prev => ({
          ...prev,
          isLoading: loading,
          canGoBack,
          canGoForward,
          currentUrl: url,
        }));
      }

      if (!loading && url !== 'about:blank') {
        perfMonitor.endPageLoad();
        
        // Only add to history if this is the active tab or if it's a user-initiated navigation
        // For now, let's assume all finished loads are worthy of history
        addToHistory({
          url,
          title: navState.title || url,
        });

        // Update active tab
        const activeTab = getActiveTab();
        if (activeTab) {
          if (isIncognito) {
            updatePrivacyTabUrl(activeTab.id, url);
            if (navState.title) updatePrivacyTabTitle(activeTab.id, navState.title);
          } else {
            updateTabUrl(activeTab.id, url);
            if (navState.title) updateTabTitle(activeTab.id, navState.title);
          }
        }
      }
    }) as any, 300),
    [isActive, updateCurrentDomain, webViewState.isLoading, webViewState.canGoBack, webViewState.canGoForward, webViewState.currentUrl, addToHistory]
  );

  /**
   * Handle WebView loading progress
   */
  const handleLoadProgress = useCallback(
    rafThrottle((progress: number) => {
      setWebViewState(prev => {
        // Only update if progress actually changed significantly (more than 1%)
        const newProgress = Math.round(progress * 100);
        if (Math.abs(newProgress - prev.progress) < 1 && newProgress < 100) {
          return prev;
        }
        return {
          ...prev,
          progress: newProgress,
        };
      });
    }),
    []
  );

  /**
   * Handle WebView errors
   */
  const handleLoadError = useCallback((error: WebViewError) => {
    logger.error('WebView load error', new Error(error.description), { 
      domain: error.domain, 
      code: error.code,
      description: error.description 
    });
    setWebViewState(prev => ({
      ...prev,
      isLoading: false,
      error,
    }));
    perfMonitor.recordError();
  }, [perfMonitor]);

  /**
   * Navigate to URL
   */
  const loadUrl = useCallback((url: string) => {
    if (!url) return;

    const searchEngine = settings?.searchEngine || 'google';
    const validation = URLValidator.normalizeURL(url, searchEngine);
    const targetUrl = validation.sanitizedUrl;

    const rateCheck = rateLimiter.isAllowed(targetUrl);
    if (!rateCheck.allowed) {
      const hostname = (() => {
        try { return new URL(targetUrl).hostname.replace('www.', ''); } catch { return ''; }
      })();
      const hasRateLimitHistory = !!useBrowserStore.getState().rateLimits[hostname];

      if (rateCheck.reason === 'throttled' && !hasRateLimitHistory) {
        // First visit to this domain — allow through despite throttle
      } else {
        logger.warn(`Navigation throttled for ${targetUrl}. Reason: ${rateCheck.reason}. Wait: ${rateCheck.waitTime}ms`);
        
        setWebViewState(prev => ({
          ...prev,
          currentUrl: targetUrl,
          isLoading: false,
          error: {
            domain: 'RateLimit',
            code: 429,
            description: rateCheck.reason === 'cooldown' 
              ? 'Too many requests. Please wait before retrying.' 
              : 'Requests are being throttled to prevent errors.',
            waitTime: rateCheck.waitTime,
            reason: rateCheck.reason,
            url: targetUrl
          },
        }));
        return;
      }
    }

    perfMonitor.startPageLoad(targetUrl);

    // Reset retry counter on new navigation
    retryCountRef.current = 0;

    // 1. Update local state immediately for fast UI response
    setWebViewState(prev => ({
      ...prev,
      currentUrl: targetUrl,
      isLoading: true,
      progress: 0,
    }));

    // 2. Update the Store so that sync effect doesn't overwrite this change
    const activeTab = getActiveTab();
    if (activeTab) {
      if (isIncognito) {
        updatePrivacyTabUrl(activeTab.id, targetUrl);
      } else {
        updateTabUrl(activeTab.id, targetUrl);
      }
    }

    // 3. Clear pending URL state if this was a pending URL load
    // Only check this if we are active
    if (isActive) {
      const pendingUrl = getPendingUrlForActiveTab();
      if (pendingUrl === targetUrl) {
        clearPendingUrlForActiveTab();
      }
    }
  }, [perfMonitor, getActiveTab, isIncognito, updateTabUrl, updatePrivacyTabUrl, settings, getPendingUrlForActiveTab, clearPendingUrlForActiveTab, isActive]);

  /**
   * Go back in history
   */
  const goBack = useCallback(() => {
    if (webViewState.canGoBack) {
      webViewRef.current?.goBack();
      return true;
    } else if (!isHomePage && onGoHome) {
      onGoHome();
      return true;
    }
    return false;
  }, [webViewState.canGoBack, isHomePage, onGoHome]);

  /**
   * Go forward in history
   */
  const goForward = useCallback(() => {
    if (webViewState.canGoForward) {
      webViewRef.current?.goForward();
    }
  }, [webViewState.canGoForward]);

  /**
   * Reload current page
   */
  const reload = useCallback(() => {
    const targetUrl = webViewState.currentUrl;
    if (!targetUrl) {
      webViewRef.current?.reload();
      return;
    }

    const rateCheck = rateLimiter.isAllowed(targetUrl);
    if (!rateCheck.allowed) {
      const hostname = (() => {
        try { return new URL(targetUrl).hostname.replace('www.', ''); } catch { return ''; }
      })();
      const hasRateLimitHistory = !!useBrowserStore.getState().rateLimits[hostname];

      if (rateCheck.reason === 'throttled' && !hasRateLimitHistory) {
        // First visit to this domain — allow through despite throttle
      } else {
        logger.warn(`Reload throttled for ${targetUrl}. Reason: ${rateCheck.reason}. Wait: ${rateCheck.waitTime}ms`);
        
        setWebViewState(prev => ({
          ...prev,
          isLoading: false,
          error: {
            domain: 'RateLimit',
            code: 429,
            description: rateCheck.reason === 'cooldown' 
              ? 'Too many requests. Please wait before retrying.' 
              : 'Requests are being throttled to prevent errors.',
            waitTime: rateCheck.waitTime,
            reason: rateCheck.reason,
            url: targetUrl
          },
        }));
        return;
      }
    }

    webViewRef.current?.reload();
  }, [webViewState.currentUrl]);

  /**
   * Stop loading
   */
  const stopLoading = useCallback(() => {
    webViewRef.current?.stopLoading();
  }, []);

  /**
   * Handle auto-retry when rate limit cooldown expires
   */
  useEffect(() => {
    const error = webViewState.error as any;
    // Handle both HTTP 429 errors and internal RateLimit throttles
    if (error?.code === 429 && (error?.domain === 'HTTP' || error?.domain === 'RateLimit') && error?.url) {
      const targetUrl = error.url;

      if (retryCountRef.current >= 3) {
        logger.warn(`Max retries (3) reached for ${targetUrl}. Stopping auto-retry.`);
        return;
      }

      const domain = new URL(targetUrl).hostname.replace('www.', '');
      const store = useBrowserStore.getState();
      
      // Calculate wait time based on store or error object
      let waitTime = 0;
      if (error.domain === 'HTTP') {
        const rateLimitInfo = store.rateLimits[domain];
        if (rateLimitInfo && rateLimitInfo.cooldownUntil > Date.now()) {
          waitTime = rateLimitInfo.cooldownUntil - Date.now();
        }
      } else {
        // For internal RateLimit domain, we have waitTime in the error object
        waitTime = error.waitTime || 0;
      }

      if (waitTime > 0) {
        logger.info(`Scheduling auto-retry for ${targetUrl} in ${waitTime}ms (attempt ${retryCountRef.current + 1}/3)`);
        const timer = setTimeout(() => {
          retryCountRef.current += 1;
          logger.info(`Auto-retrying ${targetUrl} after cooldown`);
          loadUrl(targetUrl);
        }, waitTime + 500); // Add small buffer

        return () => clearTimeout(timer);
      } else if (error.domain === 'RateLimit' && !waitTime) {
        // If it was throttled but no wait time (ready to try again)
        const timer = setTimeout(() => {
          retryCountRef.current += 1;
          loadUrl(targetUrl);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [webViewState.error, loadUrl]);

  /**
   * Handle hardware back button
   */
  useEffect(() => {
    // Only handle back press if this is the active tab
    if (!isActive) return;
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return goBack();
    });

    return () => backHandler.remove();
  }, [goBack, isActive]);

  // Batched stats update to prevent multiple store updates per second
  const batchedStatsUpdate = useRef(
    batch(((adsDelta: number, trackersDelta: number) => {
      const store = useBrowserStore.getState();
      if (adsDelta > 0) store.incrementAdsBlocked(adsDelta);
      if (trackersDelta > 0) store.incrementTrackersBlocked(trackersDelta);
    }) as any, 1000)
  ).current;

  /**
   * Handle messages from WebView
   */
  const handleMessage = useCallback(
    async (dataStr: string, onLongPress?: (data: unknown) => void, onFindMatches?: (data: { current: number, total: number }) => void) => {
      try {
        const data = JSON.parse(dataStr);

        switch (data.type) {
          case 'longPress':
          case 'contextMenuData':
            if (onLongPress) {
              onLongPress(data.data || data);
            }
            break;

          case 'debug':
            logger.debug('[WebView Debug]', data.data);
            break;

          case 'findMatches':
            if (onFindMatches && data.data) {
              onFindMatches(data.data);
            }
            break;

          case 'adBlockStats':
            const stats = data.data;
            if (stats && typeof stats === 'object') {
              // WebView sends cumulative stats - calculate delta and increment
              const adsDelta = (stats.adsBlocked || 0) - previousStatsRef.current.adsBlocked;
              const trackersDelta = (stats.trackersBlocked || 0) - previousStatsRef.current.trackersBlocked;
              
              if (adsDelta > 0 || trackersDelta > 0) {
                batchedStatsUpdate(adsDelta, trackersDelta);
              }
              
              // Update reference
              previousStatsRef.current = {
                adsBlocked: stats.adsBlocked || 0,
                trackersBlocked: stats.trackersBlocked || 0,
              };
              
              if (onAdBlockStats) {
                onAdBlockStats(stats);
              }
            }
            break;

          case 'trackingStats':
            if (data.data?.trackersBlocked > 0) {
              batchedStatsUpdate(0, data.data.trackersBlocked);
            }
            break;

          case 'formsDetected':
            if (data.data?.forms) {
              const { AutofillManager } = require('@/utils/autofillManager');
              await AutofillManager.handleFormDetection(data.data.forms);
            }
            break;

          case 'pageSource':
            const url = webViewState.currentUrl;
            useBrowserStore.getState().addTab({
              url: `view-source:${url}`,
              title: `Source: ${url.substring(0, 30)}${url.length > 30 ? '...' : ''}`,
            });
            break;

          default:
            // Handle other message types if needed
            break;
        }
      } catch (error) {
        logger.error('Failed to parse WebView message', error);
      }
    },
    [webViewState.currentUrl, onAdBlockStats, batchedStatsUpdate]
  );

  return {
    webViewRef,
    webViewState,
    navigation: {
      goBack,
      goForward,
      reload,
      stopLoading,
      loadUrl,
    },
    handlers: {
      handleNavigationStateChange,
      handleLoadProgress,
      handleLoadError,
      handleMessage,
      handleRenderProcessGone: useCallback((syntheticEvent: { nativeEvent: unknown }) => {
        const nativeEvent = syntheticEvent.nativeEvent as { didCrash: boolean };
        logger.warn('WebView render process gone', { nativeEvent });
        perfMonitor.recordError();
        setWebViewState(prev => ({
          ...prev,
          isLoading: false,
          error: {
            domain: 'WebView',
            code: -1,
            description: `Render process gone: ${nativeEvent.didCrash ? 'Crashed' : 'Killed'}`,
          },
        }));
      }, [perfMonitor]),
      handleHttpError: useCallback((syntheticEvent: WebViewHttpErrorEvent) => {
        const { nativeEvent } = syntheticEvent;
        logger.error('WebView HTTP error', new Error(`HTTP Error ${nativeEvent.statusCode}`), { 
          url: nativeEvent.url,
          statusCode: nativeEvent.statusCode 
        });

        if (nativeEvent.statusCode === 429) {
          const domain = nativeEvent.url ? new URL(nativeEvent.url).hostname.replace('www.', '') : 'unknown';
          const store = useBrowserStore.getState();
          store.recordRateLimitError(domain, store.settings.rateLimitCooldown);
          
          setWebViewState(prev => ({
            ...prev,
            isLoading: false,
            error: {
              domain: 'HTTP',
              code: 429,
              description: 'Rate limit exceeded (429). Please wait while we retry.',
              url: nativeEvent.url
            },
          }));
          return;
        }

        // Only show error for 4xx and 5xx
        if (nativeEvent.statusCode >= 400) {
          setWebViewState(prev => ({
            ...prev,
            isLoading: false,
            error: {
              domain: 'HTTP',
              code: nativeEvent.statusCode,
              description: `HTTP Error: ${nativeEvent.statusCode}`,
            },
          }));
        }
      }, []),
      handleShouldStartLoadWithRequest: useCallback((request: ShouldStartLoadRequest) => {
        // Implement URL validation and security checks here
        const { url } = request;
        
        // 1. Check for malicious schemes
        const allowedSchemes = ['http', 'https', 'about', 'data', 'blob', 'file', 'intent'];
        const scheme = url.split(':')[0].toLowerCase();
        
        // Block javascript: scheme to prevent XSS via URL
        if (scheme === 'javascript') {
          logger.warn('Blocked javascript: URL navigation', { url });
          return false;
        }

        if (!allowedSchemes.includes(scheme)) {
          // Allow intent:// schemes only if they are properly handled (maybe prompt user?)
          if (scheme === 'intent') return true; 
          return false;
        }

        // 2. Block known malicious domains (basic check)
        // This should be expanded or use a proper blocklist
        // already handled by adblocker mostly, but this is a safety net
        
        return true;
      }, []),
    },
    scripts,
  };
};

export default useWebView;
