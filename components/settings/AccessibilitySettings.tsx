import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AccessibilitySettings } from '../../types/settings';
import AccessibilityManager from '../../utils/accessibilityManager';
import { logger } from '@/utils/logger';
import type SliderType from '@react-native-community/slider';

// Conditional import for Slider
let Slider: typeof SliderType | null = null;

try {
  Slider = require('@react-native-community/slider').default;
} catch (error) {
  logger.warn('Slider component not available', { error });
}

interface AccessibilitySettingsProps {
  settings: AccessibilitySettings;
  onSettingChange: (key: keyof AccessibilitySettings, value: boolean | number) => void;
  onBack: () => void;
}

export const AccessibilitySettingsComponent: React.FC<AccessibilitySettingsProps> = ({
  settings,
  onSettingChange,
  onBack,
}) => {
  // Apply accessibility settings when they change
  useEffect(() => {
    const applySettings = async () => {
      try {
        await AccessibilityManager.applySettings();
      } catch (error) {
        logger.error('Failed to apply accessibility settings', error, { settings });
        Alert.alert('Error', 'Failed to apply accessibility settings. Please try again.');
      }
    };

    applySettings();
  }, [settings]);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Accessibility Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Display & Text</Text>
          <Text style={styles.sectionSubtitle}>Customize how content appears on screen</Text>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="text-outline" size={24} color="#ffffff" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Text Size</Text>
            <Text style={styles.settingSubtitle}>
              {Math.round(settings.textSize * 100)}% of normal size
            </Text>
            {Slider ? (
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2.0}
                step={0.1}
                value={settings.textSize}
                onValueChange={(value: number) => onSettingChange('textSize', value)}
                minimumTrackTintColor="#4285F4"
                maximumTrackTintColor="#333"
                thumbTintColor="#4285F4"
              />
            ) : (
              <Text style={{ color: '#888', fontStyle: 'italic' }}>Slider not available</Text>
            )}
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>A</Text>
              <Text style={[styles.sliderLabel, { fontSize: 20 }]}>A</Text>
            </View>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="contrast-outline" size={24} color="#ffffff" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>High Contrast Mode</Text>
            <Text style={styles.settingSubtitle}>
              Increase contrast for better readability
            </Text>
          </View>
          <Switch
            value={settings.highContrastMode}
            onValueChange={(value) => onSettingChange('highContrastMode', value)}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={settings.highContrastMode ? '#ffffff' : '#666'}
            ios_backgroundColor="#333"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="color-palette-outline" size={24} color="#ffffff" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Reduce Motion</Text>
            <Text style={styles.settingSubtitle}>
              Minimize animations and motion effects
            </Text>
          </View>
          <Switch
            value={settings.reduceMotion}
            onValueChange={(value) => onSettingChange('reduceMotion', value)}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={settings.reduceMotion ? '#ffffff' : '#666'}
            ios_backgroundColor="#333"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Navigation & Controls</Text>
          <Text style={styles.sectionSubtitle}>Customize how you interact with the browser</Text>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="hand-left-outline" size={24} color="#ffffff" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Touch Assistance</Text>
            <Text style={styles.settingSubtitle}>
              Larger touch targets and longer press duration
            </Text>
          </View>
          <Switch
            value={settings.touchAssistance}
            onValueChange={(value) => onSettingChange('touchAssistance', value)}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={settings.touchAssistance ? '#ffffff' : '#666'}
            ios_backgroundColor="#333"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="mic-outline" size={24} color="#ffffff" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Screen Reader Support</Text>
            <Text style={styles.settingSubtitle}>
              Optimize for screen readers and voice navigation
            </Text>
          </View>
          <Switch
            value={settings.screenReaderOptimized}
            onValueChange={(value) => onSettingChange('screenReaderOptimized', value)}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={settings.screenReaderOptimized ? '#ffffff' : '#666'}
            ios_backgroundColor="#333"
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#4285F4" />
          <Text style={styles.infoText}>
            These settings help make the browser more accessible. Some changes may require restarting the app to take full effect.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    // Add paddingTop for Android status bar
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 8,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  sliderLabel: {
    color: '#888',
    fontSize: 12,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    color: '#aaa',
    marginLeft: 8,
    flex: 1,
  },
});

export default AccessibilitySettingsComponent;