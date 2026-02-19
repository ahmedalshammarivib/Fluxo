import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  Modal,
  TextInput,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useBrowserStore } from '@/store/browserStore';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SearchEngineSettings } from '@/components/settings/SearchEngineSettings';
import { PasswordManagerSettings } from '@/components/settings/PasswordManagerSettings';
import { PaymentMethodsSettings } from '@/components/settings/PaymentMethodsSettings';
import { AddressesSettings } from '@/components/settings/AddressesSettings';
import { PrivacySecuritySettings } from '@/components/settings/PrivacySecuritySettings';
import { NotificationsSettings } from '@/components/settings/NotificationsSettings';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import SitePermissionsSettings from '@/components/settings/SitePermissionsSettings';
import { logger } from '@/utils/logger';
import { getThemeColors, colors } from '@/theme/colors';
import { LanguageSettingsComponent } from '@/components/settings/LanguageSettings';
import { DownloadsSettingsComponent } from '@/components/settings/DownloadsSettings';
import { AccessibilitySettingsComponent } from '@/components/settings/AccessibilitySettings';
import { AboutSettings } from '@/components/settings/AboutSettings';
import {
  AdvancedBrowserSettings,
  AccessibilitySettings,
  SitePermissions,
  LanguageSettings,
  DownloadSettings
} from '@/types/settings';

type SettingsView =
  | 'main'
  | 'search-engine'
  | 'password-manager'
  | 'payment-methods'
  | 'addresses'
  | 'privacy-security'
  | 'notifications'
  | 'appearance'
  | 'accessibility'
  | 'site-settings'
  | 'languages'
  | 'downloads'
  | 'about';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<SettingsView>('main');
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedBrowserSettings>({
    nightMode: false,
    incognitoMode: false,
    desktopMode: false,
    adBlockEnabled: true,
    searchEngine: 'google',
    homepage: 'https://www.google.com',
    autoSaveHistory: true,
    maxHistoryItems: 1000,
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
  });

  const {
    isAdBlockEnabled,
    toggleAdBlock,
    incognitoMode,
    toggleIncognitoMode,
    desktopMode,
    toggleDesktopMode,
    nightMode,
    toggleNightMode,
    updateSetting,
  } = useBrowserStore();

  // Load all settings from browser store
  useEffect(() => {
    const loadAllSettings = async () => {
      try {
        // Load settings from browser store
        await useBrowserStore.getState().loadSettings();

        // Get the latest settings
        const currentSettings = useBrowserStore.getState().settings;

        // Update local state with all settings
        setAdvancedSettings(currentSettings);
      } catch (error) {
        logger.error('Failed to load settings', error);
      }
    };

    loadAllSettings();
  }, []);

  // Sync with browser store for basic settings
  useEffect(() => {
    setAdvancedSettings(prev => ({
      ...prev,
      nightMode,
      incognitoMode,
      desktopMode,
      adBlockEnabled: isAdBlockEnabled,
    }));
  }, [nightMode, incognitoMode, desktopMode, isAdBlockEnabled]);

  const handleSettingChange = async (section: 'passwordManager' | 'paymentMethods' | 'addresses' | 'privacy' | 'notifications' | 'appearance' | 'language' | 'sitePermissions' | 'accessibility' | 'downloads', key: string, value: unknown) => {
    setAdvancedSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));

    // Update browser store for nested settings
    await updateSetting(section as keyof AdvancedBrowserSettings, {
      ...advancedSettings[section],
      [key]: value
    });
  };


  const handleBasicSettingChange = async (key: keyof AdvancedBrowserSettings, value: unknown) => {
    // FIXED: Removed debug console.log for production

    setAdvancedSettings(prev => ({
      ...prev,
      [key]: value,
    }));

    // Update browser store
    await updateSetting(key, value as AdvancedBrowserSettings[keyof AdvancedBrowserSettings]);
  };

  // Get theme colors based on night mode and incognito mode
  const themeColors = getThemeColors(nightMode, incognitoMode);

  // Render different views based on currentView
  if (currentView === 'search-engine') {
    return (
      <SearchEngineSettings
        currentEngine={advancedSettings.searchEngine}
        onEngineChange={(engine) => handleBasicSettingChange('searchEngine', engine)}
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'password-manager') {
    return (
      <PasswordManagerSettings
        settings={advancedSettings.passwordManager}
        onSettingChange={(key, value) => handleSettingChange('passwordManager', key, value)}
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'payment-methods') {
    return (
      <PaymentMethodsSettings
        saveAndFill={advancedSettings.paymentMethods.saveAndFill}
        onToggleSaveAndFill={(value) => handleSettingChange('paymentMethods', 'saveAndFill', value)}
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'addresses') {
    return (
      <AddressesSettings
        saveAndFill={advancedSettings.addresses.saveAndFill}
        onToggleSaveAndFill={(value) => handleSettingChange('addresses', 'saveAndFill', value)}
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'privacy-security') {
    return (
      <PrivacySecuritySettings
        settings={advancedSettings.privacy}
        onSettingChange={(key, value) => handleSettingChange('privacy', key, value)}
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'notifications') {
    return (
      <NotificationsSettings
        settings={advancedSettings.notifications}
        onSettingChange={(key, value) => handleSettingChange('notifications', key, value)}
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'appearance') {
    return (
      <AppearanceSettings
        settings={advancedSettings.appearance}
        onSettingChange={(key, value) => handleSettingChange('appearance', key, value)}
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'site-settings') {
    return (
      <SitePermissionsSettings
        settings={advancedSettings.sitePermissions}
        onSettingChange={(key, value) => handleSettingChange('sitePermissions', key, value)}
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'languages') {
    return (
      <LanguageSettingsComponent
        settings={advancedSettings.language}
        onSettingChange={(key, value) => handleSettingChange('language', key, value)}
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'downloads') {
    return (
      <DownloadsSettingsComponent
        settings={advancedSettings.downloads}
        onSettingChange={(key, value) => handleSettingChange('downloads', key, value)}
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'accessibility') {
    return (
      <AccessibilitySettingsComponent
        settings={advancedSettings.accessibility}
        onSettingChange={(key, value) => handleSettingChange('accessibility', key, value)}
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'about') {
    return (
      <AboutSettings
        onBack={() => setCurrentView('main')}
      />
    );
  }

  // Main settings view - Reorganized based on audit findings
  const settingsGroups = [
    {
      title: t('browsing'),
      items: [
        {
          icon: 'search-outline',
          title: t('searchEngine'),
          subtitle: advancedSettings.searchEngine === 'google' ? 'Google' :
            advancedSettings.searchEngine === 'bing' ? 'Bing' :
              advancedSettings.searchEngine === 'duckduckgo' ? 'DuckDuckGo' :
                advancedSettings.searchEngine === 'yahoo' ? 'Yahoo' :
                  advancedSettings.searchEngine === 'ecosia' ? 'Ecosia' : t('custom'),
          type: 'navigate',
          onPress: () => setCurrentView('search-engine'),
        },
        {
          icon: 'desktop-outline',
          title: t('desktopMode'),
          subtitle: t('desktopModeDesc'),
          type: 'switch',
          value: desktopMode,
          onToggle: toggleDesktopMode,
        },
        {
          icon: 'download-outline',
          title: t('downloads'),
          subtitle: t('downloadsDesc'),
          type: 'navigate',
          onPress: () => setCurrentView('downloads'),
        },
      ],
    },
    {
      title: t('appearance'),
      items: [
        {
          icon: 'color-palette-outline',
          title: t('themeDisplay'),
          subtitle: t('themeDisplayDesc'),
          type: 'navigate',
          onPress: () => setCurrentView('appearance'),
        },
        {
          icon: 'moon',
          title: t('nightMode'),
          subtitle: t('nightModeDesc'),
          type: 'switch',
          value: nightMode,
          onToggle: toggleNightMode,
        },
      ],
    },
    {
      title: t('privacySecurity'),
      items: [
        {
          icon: 'shield-checkmark-outline',
          title: t('privacyCenter'),
          subtitle: t('privacyCenterDesc'),
          type: 'navigate',
          onPress: () => setCurrentView('privacy-security'),
        },
        {
          icon: 'shield-outline',
          title: t('adBlock'),
          subtitle: isAdBlockEnabled ? t('protectionActive') : t('adBlockDesc'),
          type: 'navigate',
          onPress: () => router.push('/(tabs)/adBlocker'),
        },
        {
          icon: 'eye-off-outline',
          title: t('incognito'),
          subtitle: t('incognitoDesc'),
          type: 'switch',
          value: incognitoMode,
          onToggle: toggleIncognitoMode,
        },
        {
          icon: 'settings-outline',
          title: t('sitePermissions'),
          subtitle: t('sitePermissionsDesc'),
          type: 'navigate',
          onPress: () => setCurrentView('site-settings'),
        },
      ],
    },
    {
      title: t('dataAutofill'),
      items: [
        {
          icon: 'key-outline',
          title: t('passwordManager'),
          subtitle: t('passwordManagerDesc'),
          type: 'navigate',
          onPress: () => setCurrentView('password-manager'),
        },
        {
          icon: 'card-outline',
          title: t('paymentMethods'),
          subtitle: t('paymentMethodsDesc'),
          type: 'navigate',
          onPress: () => setCurrentView('payment-methods'),
        },
        {
          icon: 'location-outline',
          title: t('addresses'),
          subtitle: t('addressesDesc'),
          type: 'navigate',
          onPress: () => setCurrentView('addresses'),
        },
      ],
    },
    {
      title: t('preferences'),
      items: [
        {
          icon: 'notifications-outline',
          title: t('notifications'),
          subtitle: t('notificationsDesc'),
          type: 'navigate',
          onPress: () => setCurrentView('notifications'),
        },
        {
          icon: 'language-outline',
          title: t('languages'),
          subtitle: t('languagesDesc'),
          type: 'navigate',
          onPress: () => setCurrentView('languages'),
        },
        {
          icon: 'accessibility-outline',
          title: t('accessibility'),
          subtitle: t('accessibilityDesc'),
          type: 'navigate',
          onPress: () => setCurrentView('accessibility'),
        },
      ],
    },
    {
      title: t('aboutSection'),
      items: [
        {
          icon: 'information-circle-outline',
          title: t('about'),
          subtitle: t('aboutDesc'),
          type: 'navigate',
          onPress: () => setCurrentView('about'),
        },
      ],
    },
  ];

  const renderSettingItem = (item: {
    icon: string;
    title: string;
    subtitle: string;
    type: 'navigate' | 'switch';
    value?: boolean;
    onPress?: () => void;
    onToggle?: (value: boolean) => void;
  }, index: number) => {
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.settingItem,
          item.value && styles.activeSettingItem
        ]}
        onPress={item.type === 'navigate' ? item.onPress : undefined}
        activeOpacity={0.7}
      >
        <View style={[
          styles.settingIcon,
          item.value && styles.activeSettingIcon
        ]}>
          <Ionicons
            name={item.icon as any}
            size={22}
            color={item.value ? '#4CAF50' : '#4285f4'}
          />
        </View>

        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          {item.subtitle && (
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          )}
        </View>

        {item.type === 'switch' && (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={item.value ? '#ffffff' : '#666'}
            ios_backgroundColor="#333"
          />
        )}

        {item.type === 'navigate' && (
          <Ionicons name="chevron-forward" size={18} color="#aaaaaa" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={themeColors.gradient} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
        <View style={[styles.header, { backgroundColor: themeColors.topBar, paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t('settings')}</Text>
            {incognitoMode && (
              <View style={styles.modeIndicator}>
                <Ionicons name="eye-off" size={12} color="#ff6b6b" />
                <Text style={styles.modeIndicatorText}>{t('incognito')}</Text>
              </View>
            )}
            {nightMode && !incognitoMode && (
              <View style={styles.modeIndicator}>
                <Ionicons name="moon" size={12} color="#f5a623" />
                <Text style={[styles.modeIndicatorText, { color: '#f5a623' }]}>{t('nightMode')}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => Alert.alert(t('help'), t('settingsHelpInfo'))}>
            <Ionicons name="help-circle-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {settingsGroups.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.settingGroup}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <View style={styles.groupContainer}>
                {group.items.map((item, itemIndex) => renderSettingItem(item as any, itemIndex))}
              </View>
            </View>
          ))}

          {/* App Info */}
          <View style={styles.appInfo}>
            <View style={styles.appIconContainer}>
              <Image source={require('../../App icon.png')} style={styles.appIconImage} />
            </View>
            <Text style={styles.appName}>{t('appName')} Browser</Text>
            <Text style={styles.appVersion}>{t('version')} 1.0.0</Text>
            <Text style={styles.appDescription}>
              {t('appDescription')}
            </Text>

            <View style={styles.appActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="star-outline" size={20} color="#4285f4" />
                <Text style={styles.actionButtonText}>{t('rateApp')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="share-outline" size={20} color="#4285f4" />
                <Text style={styles.actionButtonText}>{t('share')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    // paddingTop is now handled dynamically using insets.top
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(10, 11, 30, 0.95)',
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  modeIndicatorText: {
    fontSize: 10,
    color: '#ff6b6b',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingTop: 12,
  },
  settingGroup: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  groupContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeSettingItem: {
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activeSettingIcon: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#aaaaaa',
    lineHeight: 16,
  },
  appInfo: {
    alignItems: 'center',
    padding: 32,
    marginTop: 20,
    marginBottom: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  appIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appIconImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 14,
    color: '#aaaaaa',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  appActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.3)',
  },
  actionButtonText: {
    color: '#4285f4',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});