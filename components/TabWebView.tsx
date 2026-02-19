import React, { forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useWebView, WebViewState } from '@/hooks/useWebView';
import { useBrowserStore } from '@/store/browserStore';
import { SimpleTab } from '@/types/simpleTabs';
import { logger } from '@/utils/logger';
import { rafThrottle } from '@/utils/performanceHelpers';
import { getMobileUserAgent, getDesktopUserAgent, getAppNameForUserAgent } from '@/utils/userAgent';

import { LongPressData } from '@/types/webView';
import type { FileDownloadEvent } from 'react-native-webview/lib/WebViewTypes';

interface TabWebViewProps {
  tab: SimpleTab;
  isActive: boolean;
  isIncognito: boolean;
  isHomePage: boolean;
  onStateChange?: (tabId: string, state: WebViewState) => void;
  onLoadProgress?: (progress: number) => void;
  onMessage?: (event: WebViewMessageEvent) => void;
  userAgent?: string;
  nightMode?: boolean;
  textZoom?: number;
  injectedJavaScriptBeforeContentLoaded?: string;
  injectedJavaScript?: string;
  onLongPress?: (data: LongPressData) => void;
  onFileDownload?: (event: FileDownloadEvent) => void;
  onFindMatches?: (data: { current: number, total: number }) => void;
  onLoadEnd?: (tabId: string) => void;
}

export interface TabWebViewHandle {
  loadUrl: (url: string) => void;
  goBack: () => boolean;
  goForward: () => void;
  reload: () => void;
  stopLoading: () => void;
  injectJavaScript: (script: string) => void;
  getWebViewRef: () => React.RefObject<WebView | null>;
  getContainerRef: () => React.RefObject<View | null>;
}

const getInitialSource = (url: string): { uri: string } | { html: string } => {
  const safeUrl = url || '';
  if (!safeUrl || safeUrl === 'about:blank') {
    if (Platform.OS === 'ios') {
      // Use empty HTML instead of about:blank on iOS
      return { html: '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="background:#fff;margin:0;padding:0;"></body></html>' };
    }
    return { uri: 'about:blank' };
  }
  return { uri: safeUrl };
};

export const TabWebView = forwardRef<TabWebViewHandle, TabWebViewProps>((props, ref) => {
  const { 
    tab, 
    isActive, 
    isIncognito, 
    isHomePage,
    onStateChange, 
    onLoadProgress,
    onMessage,
    userAgent,
    nightMode,
    textZoom,
    injectedJavaScriptBeforeContentLoaded,
    injectedJavaScript,
    onLoadEnd
  } = props;

  const { desktopMode } = useBrowserStore();
  const fallbackUA = desktopMode ? getDesktopUserAgent() : getMobileUserAgent();

  const containerRef = useRef<View>(null);
  
  // Advanced Plan: Smart Source Synchronization
  // We use local state for the source URI to prevent reactive reloads
  const [sourceUri, setSourceUri] = React.useState<string>(tab.url || 'about:blank');
  
  // Guard ref to track if an update comes from internal navigation
  const isInternalNavigation = useRef(false);
  const lastUrlRef = useRef(tab.url);

  // Throttled progress handler to prevent excessive re-renders
  const throttledOnLoadProgress = useRef(
    rafThrottle((progress: number) => {
      if (onLoadProgress) {
        onLoadProgress(progress);
      }
    })
  ).current;

  // Sync sourceUri with tab.url ONLY when it's an external change
  useEffect(() => {
    const newUrl = tab.url || 'about:blank';
    
    // If the URL has changed and it wasn't marked as internal navigation
    if (newUrl !== lastUrlRef.current) {
      if (!isInternalNavigation.current) {
        setSourceUri(newUrl);
      }
      // Reset the guard and update last known URL
      isInternalNavigation.current = false;
      lastUrlRef.current = newUrl;
    }
  }, [tab.url]);

  // Use the custom hook with specific tab ID
  const {
    webViewRef,
    webViewState,
    navigation,
    handlers,
    scripts
  } = useWebView({
    isHomePage: isActive && isHomePage,
    tabId: tab.id,
    isIncognito,
    isActive
  });

  // Intercept navigation state changes to set the guard
  const handleNavigationStateChange = (navState: any) => {
    // If the URL is changing due to internal navigation, mark it
    if (navState.url && navState.url !== lastUrlRef.current) {
      isInternalNavigation.current = true;
    }
    handlers.handleNavigationStateChange(navState);
  };

  // Handle load end to trigger screenshot
  const handleLoadEnd = () => {
    if (isActive && onLoadEnd) {
      onLoadEnd(tab.id);
    }
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    loadUrl: (url: string) => {
      // Explicit load calls are always external
      isInternalNavigation.current = false;
      
      // If the URL is the same as the current sourceUri, the source prop won't change
      // So we need to force navigation using JavaScript
      if (url === sourceUri) {
         webViewRef.current?.injectJavaScript(`window.location.href = "${url}"`);
      } else {
         setSourceUri(url);
      }
      
      navigation.loadUrl(url);
    },
    goBack: navigation.goBack,
    goForward: navigation.goForward,
    reload: navigation.reload,
    stopLoading: navigation.stopLoading,
    injectJavaScript: (script: string) => {
      webViewRef.current?.injectJavaScript(script);
    },
    getWebViewRef: () => webViewRef,
    getContainerRef: () => containerRef
  }));

  // Notify parent of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(tab.id, webViewState);
    }
  }, [webViewState, tab.id, onStateChange]);

  // Determine visibility
  // Visible only if active AND not on home page
  // We keep it mounted but hidden to preserve state
  const isVisible = isActive && !isHomePage;

  return (
    <View 
      ref={containerRef}
      style={[
        styles.container, 
        !isVisible && styles.hidden
      ]}
      collapsable={false}
    >
      <WebView
        ref={webViewRef}
        source={getInitialSource(sourceUri)}
        style={[
          styles.webview, 
          { backgroundColor: nightMode ? '#000000' : '#ffffff' }
        ]}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadEnd={handleLoadEnd}
        onLoadProgress={(e) => {
          const progress = e.nativeEvent.progress;
          handlers.handleLoadProgress(progress);
          if (isActive) {
            throttledOnLoadProgress(progress);
          }
        }}
        onError={(e) => {
          handlers.handleLoadError(e.nativeEvent);
        }}
        onHttpError={handlers.handleHttpError}
        onShouldStartLoadWithRequest={handlers.handleShouldStartLoadWithRequest}
        onFileDownload={props.onFileDownload}
        javaScriptEnabled={true}
        startInLoadingState={true}
        cacheEnabled={true}
        bounces={false}
        allowsBackForwardNavigationGestures={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        thirdPartyCookiesEnabled={true}
        userAgent={userAgent || fallbackUA}
        applicationNameForUserAgent={getAppNameForUserAgent()}
        sharedCookiesEnabled={true}
        allowsLinkPreview={false}
        onMessage={(e) => {
          const data = e.nativeEvent.data;
          handlers.handleMessage(data, props.onLongPress as (data: unknown) => void, props.onFindMatches);
          if (onMessage) onMessage(e);
        }}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded || scripts.preloadScript}
        injectedJavaScript={`${injectedJavaScript || scripts.postLoadScript}${
          Platform.OS === 'ios' && textZoom && textZoom !== 100
            ? `;(function(){ 
                 document.documentElement.style.webkitTextSizeAdjust = '${textZoom}%';
                 document.body.style.webkitTextSizeAdjust = '${textZoom}%';
               })();`
            : ''
        }`}
        decelerationRate="normal"
        keyboardDisplayRequiresUserAction={false}
        incognito={isIncognito}
        {...(Platform.OS === 'android' && {
          onRenderProcessGone: handlers.handleRenderProcessGone,
          cacheMode: "LOAD_CACHE_ELSE_NETWORK",
          renderToHardwareTextureAndroid: true,
          androidLayerType: "hardware",
          overScrollMode: "never",
          mixedContentMode: "compatibility",
          scalesPageToFit: true,
          domStorageEnabled: true,
          textZoom: textZoom,
        })}
        {...(Platform.OS === 'ios' && {
          onContentProcessDidTerminate: () => {
             console.warn('iOS WKWebView process terminated, reloading...');
             webViewRef.current?.reload();
          },
          contentInsetAdjustmentBehavior: "automatic",
          automaticallyAdjustContentInsets: false,
          dataDetectorTypes: "none",
          allowsAirPlayForMediaPlayback: false,
        })}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  hidden: {
    display: 'none',
    position: 'absolute',
    left: -10000,
    top: -10000,
    opacity: 0,
    zIndex: -1,
    height: 0, // Ensure it takes no space
    width: 0,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
