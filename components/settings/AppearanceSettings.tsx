import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppearanceSettings as AppearanceSettingsType } from '../../types/settings';
import AppearanceManager from '../../utils/appearanceManager';
import { logger } from '@/utils/logger';
import type SliderType from '@react-native-community/slider';

// Conditional import for Slider
let Slider: typeof SliderType | null = null;

try {
  Slider = require('@react-native-community/slider').default;
} catch (error) {
  logger.warn('Slider component not available', { error });
}

interface AppearanceSettingsProps {
  settings: AppearanceSettingsType;
  onSettingChange: (key: keyof AppearanceSettingsType, value: string | number | boolean) => void;
  onBack: () => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  settings,
  onSettingChange,
  onBack,
}) => {
  const [showThemeModal, setShowThemeModal] = React.useState(false);
  const [showZoomModal, setShowZoomModal] = React.useState(false);
  const [showLayoutModal, setShowLayoutModal] = React.useState(false);

  // Apply appearance settings when they change
  useEffect(() => {
    const applySettings = async () => {
      try {
        await AppearanceManager.applySettings(settings);
      } catch (error) {
        logger.error('Error applying appearance settings', error, { settings });
        Alert.alert(
          'Error',
          'Failed to apply appearance settings. Please try again.'
        );
      }
    };
    
    applySettings();
  }, [settings]);

  const themeOptions = [
    { id: 'system', title: 'System default', subtitle: 'Follow device theme', icon: 'contrast-outline' },
    { id: 'light', title: 'Light', subtitle: 'Always use light theme', icon: 'sunny-outline' },
    { id: 'dark', title: 'Dark', subtitle: 'Always use dark theme', icon: 'moon-outline' },
  ];

  const zoomOptions = [
    { value: 75, label: '75%' },
    { value: 100, label: '100% (Default)' },
    { value: 125, label: '125%' },
    { value: 150, label: '150%' },
  ];

  const layoutOptions = [
    { id: 'default', title: 'Default', subtitle: 'Standard toolbar layout' },
    { id: 'compact', title: 'Compact', subtitle: 'Smaller toolbar elements' },
    { id: 'minimal', title: 'Minimal', subtitle: 'Hide non-essential elements' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appearance</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Theme */}
        <TouchableOpacity style={styles.settingItem} onPress={() => setShowThemeModal(true)}>
          <View style={styles.settingIcon}>
            <Ionicons name="color-palette" size={24} color="#4285f4" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Theme</Text>
            <Text style={styles.settingSubtitle}>
              {themeOptions.find(t => t.id === settings.theme)?.title || 'System default'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>

        {/* Font Size */}
        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="text" size={24} color="#4285f4" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Font Size</Text>
            <Text style={styles.settingSubtitle}>{settings.fontSize}px</Text>
          </View>
        </View>
        
        <View style={styles.sliderContainer}>
          {Slider ? (
            <Slider
              style={styles.slider}
              minimumValue={12}
              maximumValue={24}
              value={settings.fontSize}
              onValueChange={(value: number) => onSettingChange('fontSize', Math.round(value))}
              minimumTrackTintColor="#4285f4"
              maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
            />
          ) : (
            <View style={styles.sliderFallback}>
              <TouchableOpacity
                style={styles.fontSizeButton}
                onPress={() => onSettingChange('fontSize', Math.max(12, settings.fontSize - 2))}
              >
                <Ionicons name="remove" size={20} color="#4285f4" />
              </TouchableOpacity>
              <Text style={styles.fontSizeValue}>{settings.fontSize}px</Text>
              <TouchableOpacity
                style={styles.fontSizeButton}
                onPress={() => onSettingChange('fontSize', Math.min(24, settings.fontSize + 2))}
              >
                <Ionicons name="add" size={20} color="#4285f4" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>Small</Text>
            <Text style={styles.sliderLabel}>Large</Text>
          </View>
        </View>

        {/* Page Zoom */}
        <TouchableOpacity style={styles.settingItem} onPress={() => setShowZoomModal(true)}>
          <View style={styles.settingIcon}>
            <Ionicons name="resize" size={24} color="#4285f4" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Page Zoom</Text>
            <Text style={styles.settingSubtitle}>{settings.pageZoom}%</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>

        {/* Toolbar Layout */}
        <TouchableOpacity style={styles.settingItem} onPress={() => setShowLayoutModal(true)}>
          <View style={styles.settingIcon}>
            <Ionicons name="grid" size={24} color="#4285f4" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Toolbar Layout</Text>
            <Text style={styles.settingSubtitle}>
              {layoutOptions.find(l => l.id === settings.toolbarLayout)?.title || 'Default'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>
      </ScrollView>

      {/* Theme Modal */}
      <Modal visible={showThemeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Theme</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              {themeOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    settings.theme === option.id && styles.selectedOption
                  ]}
                  onPress={() => {
                    onSettingChange('theme', option.id as any);
                    setShowThemeModal(false);
                  }}
                >
                  <View style={styles.themeOptionIcon}>
                    <Ionicons name={option.icon as any} size={24} color="#4285f4" />
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>
                  {settings.theme === option.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Zoom Modal */}
      <Modal visible={showZoomModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Page Zoom</Text>
              <TouchableOpacity onPress={() => setShowZoomModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              {zoomOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    settings.pageZoom === option.value && styles.selectedOption
                  ]}
                  onPress={() => {
                    onSettingChange('pageZoom', option.value);
                    setShowZoomModal(false);
                  }}
                >
                  <Text style={styles.optionTitle}>{option.label}</Text>
                  {settings.pageZoom === option.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Layout Modal */}
      <Modal visible={showLayoutModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Toolbar Layout</Text>
              <TouchableOpacity onPress={() => setShowLayoutModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              {layoutOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    settings.toolbarLayout === option.id && styles.selectedOption
                  ]}
                  onPress={() => {
                    onSettingChange('toolbarLayout', option.id as any);
                    setShowLayoutModal(false);
                  }}
                >
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>
                  {settings.toolbarLayout === option.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0b1e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    // Add paddingTop for Android status bar
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingIcon: {
    marginRight: 16,
  },
  settingInfo: {
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
    color: '#888',
    lineHeight: 16,
  },
  sliderContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#4285f4',
    width: 20,
    height: 20,
  },
  sliderFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  fontSizeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(66, 133, 244, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginHorizontal: 20,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#888',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1a1b3a',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalContent: {
    padding: 20,
  },
  themeOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedOption: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#888',
  },
});