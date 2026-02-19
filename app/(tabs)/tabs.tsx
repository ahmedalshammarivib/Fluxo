/**
 * Tabs Screen - Redesigned with Dual Mode System (Normal/Privacy)
 * Features: 2-column grid layout, full page theming, mode switching
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useBrowserStore } from '@/store/browserStore';
import { logger } from '@/utils/logger';
import { SimpleTab, TabsViewMode } from '@/types/simpleTabs';
import {
  TabCard,
  TabModeSwitch,
  TabsBottomBar,
  PrivacyEmptyState,
  NormalEmptyState,
  getTabsTheme,
  getStatusBarStyle,
} from '@/components/tabs';
import {
  responsiveSpacing,
} from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

const TabsScreen = React.memo(() => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();

  // Store state
  const {
    // Normal tabs
    tabs,
    activeTabId,
    createNewTab,
    switchToTab,
    closeTab,
    loadTabs,
    getTabsCount,
    closeAllNormalTabs,
    // Privacy tabs
    privacyTabs,
    activePrivacyTabId,
    createPrivacyTab,
    switchToPrivacyTab,
    closePrivacyTab,
    closeAllPrivacyTabs,
    getPrivacyTabsCount,
    // View mode
    tabsViewMode,
    setTabsViewMode,
    // Other
    incognitoMode,
    nightMode,
  } = useBrowserStore();

  // Get current theme based on view mode and night mode
  const theme = useMemo(() => getTabsTheme(tabsViewMode, nightMode), [tabsViewMode, nightMode]);
  const isPrivacyMode = tabsViewMode === 'privacy';

  // Calculate card dimensions for 2-column grid
  const CARD_GAP = responsiveSpacing(12);
  const HORIZONTAL_PADDING = responsiveSpacing(16);
  const cardWidth = (screenWidth - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

  // Load tabs when screen mounts
  useEffect(() => {
    loadTabs();
  }, [loadTabs]);

  // Get current tabs based on mode
  const currentTabs = isPrivacyMode ? privacyTabs : tabs;
  const currentActiveTabId = isPrivacyMode ? activePrivacyTabId : activeTabId;
  const currentTabCount = isPrivacyMode ? getPrivacyTabsCount() : getTabsCount();

  // Handle mode change with incognito synchronization
  const handleModeChange = useCallback((mode: TabsViewMode) => {
    setTabsViewMode(mode);

    // CRITICAL: Sync incognito mode with tab view mode
    if (mode === 'normal' && incognitoMode) {
      // Switching to Normal Mode → Disable incognito
      useBrowserStore.getState().toggleIncognitoMode();
    } else if (mode === 'privacy' && !incognitoMode) {
      // Switching to Privacy Mode → Enable incognito
      useBrowserStore.getState().toggleIncognitoMode();
    }
  }, [setTabsViewMode, incognitoMode]);

  // Handle create new tab
  const handleCreateNewTab = useCallback(() => {
    if (isPrivacyMode) {
      createPrivacyTab();
    } else {
      // Get settings from browser store
      const { settings } = useBrowserStore.getState();
      const searchEngine = settings?.searchEngine || 'google';

      const engineHomepages: { [key: string]: string } = {
        google: 'https://www.google.com',
        bing: 'https://www.bing.com',
        duckduckgo: 'https://duckduckgo.com',
        yahoo: 'https://www.yahoo.com',
        ecosia: 'https://www.ecosia.org',
      };

      let homepageUrl = engineHomepages[searchEngine] || 'https://www.google.com';

      // Handle custom search engine
      if (!engineHomepages[searchEngine] && searchEngine.includes('://')) {
        try {
          const url = new URL(searchEngine.split('{searchTerms}')[0].split('%s')[0]);
          homepageUrl = url.origin;
        } catch (error) {
          logger.error('Error parsing custom search engine URL', error, { searchEngine });
        }
      }

      createNewTab(homepageUrl);
    }
    // Navigate back to home
    router.push({ pathname: '/(tabs)', params: { view: 'browser' } });
  }, [isPrivacyMode, createPrivacyTab, createNewTab]);

  // Handle switch to tab
  const handleSwitchToTab = useCallback((tabId: string) => {
    if (isPrivacyMode) {
      const isCurrentlyActive = tabId === activePrivacyTabId;
      switchToPrivacyTab(tabId, isCurrentlyActive);
    } else {
      const isCurrentlyActive = tabId === activeTabId;
      switchToTab(tabId, isCurrentlyActive);
    }
    router.push({ pathname: '/(tabs)', params: { view: 'browser' } });
  }, [isPrivacyMode, switchToPrivacyTab, switchToTab, activeTabId, activePrivacyTabId]);

  // Handle close tab
  const handleCloseTab = useCallback((tabId: string) => {
    if (isPrivacyMode) {
      closePrivacyTab(tabId);
    } else {
      if (tabs.length === 1) {
        Alert.alert(
          t('alert', 'Alert'),
          t('cannotCloseLastTab', 'Cannot close the last tab. A new tab will be created.'),
          [{ text: t('ok', 'OK') }]
        );
      }
      closeTab(tabId);
    }
  }, [isPrivacyMode, closePrivacyTab, closeTab, tabs.length, t]);

  // Handle close all
  const handleCloseAll = useCallback(() => {
    const tabCount = isPrivacyMode ? privacyTabs.length : tabs.length;

    if (tabCount === 0) return;

    Alert.alert(
      t('closeAllTabs', 'Close All Tabs'),
      t('closeAllTabsConfirm', `Are you sure you want to close all ${tabCount} tab(s)?`),
      [
        { text: t('cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('closeAll', 'Close All'),
          style: 'destructive',
          onPress: () => {
            if (isPrivacyMode) {
              closeAllPrivacyTabs();
            } else {
              closeAllNormalTabs();
            }
          },
        },
      ]
    );
  }, [isPrivacyMode, privacyTabs.length, tabs.length, closeAllPrivacyTabs, closeAllNormalTabs, t]);

  // Handle done
  const handleDone = useCallback(() => {
    // Navigate back to home with browser view mode
    router.push({ pathname: '/(tabs)', params: { view: 'browser' } });
  }, []);

  // Render tab card
  const renderTabCard = useCallback(({ item }: { item: SimpleTab }) => (
    <TabCard
      tab={item}
      isActive={item.id === currentActiveTabId}
      onPress={() => handleSwitchToTab(item.id)}
      onClose={() => handleCloseTab(item.id)}
      theme={theme}
      cardWidth={cardWidth}
    />
  ), [currentActiveTabId, handleSwitchToTab, handleCloseTab, theme, cardWidth]);

  // Key extractor
  const keyExtractor = useCallback((item: SimpleTab) => item.id, []);

  // Empty component
  const EmptyComponent = useCallback(() => {
    if (isPrivacyMode) {
      return <PrivacyEmptyState theme={theme} />;
    }
    return <NormalEmptyState theme={theme} />;
  }, [isPrivacyMode, theme]);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={getStatusBarStyle(tabsViewMode, nightMode)}
        backgroundColor="transparent"
        translucent
      />

      <LinearGradient
        colors={theme.gradientColors}
        style={styles.gradient}
      >
        <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Mode Switcher */}
          <TabModeSwitch
            currentMode={tabsViewMode}
            onModeChange={handleModeChange}
            normalTabCount={getTabsCount()}
            privacyTabCount={getPrivacyTabsCount()}
            theme={theme}
          />

          {/* Tabs Grid */}
          <FlatList
            data={currentTabs}
            numColumns={2}
            keyExtractor={keyExtractor}
            renderItem={renderTabCard}
            columnWrapperStyle={styles.row}
            contentContainerStyle={[
              styles.gridContainer,
              currentTabs.length === 0 && styles.emptyContainer,
            ]}
            ListEmptyComponent={EmptyComponent}
            showsVerticalScrollIndicator={false}
          />

          {/* Bottom Bar */}
          <TabsBottomBar
            onCloseAll={handleCloseAll}
            onAddTab={handleCreateNewTab}
            onDone={handleDone}
            theme={theme}
            tabCount={currentTabCount}
            isPrivacyMode={isPrivacyMode}
          />
        </View>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: responsiveSpacing(16),
    marginBottom: responsiveSpacing(12),
  },
  gridContainer: {
    paddingTop: responsiveSpacing(8),
    paddingBottom: responsiveSpacing(100), // Space for bottom bar
  },
  emptyContainer: {
    flex: 1,
  },
});

export default TabsScreen;
