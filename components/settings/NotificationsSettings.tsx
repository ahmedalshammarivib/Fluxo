import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationSettings } from '../../types/settings';

interface NotificationsSettingsProps {
  settings: NotificationSettings;
  onSettingChange: (key: keyof NotificationSettings, value: boolean) => void;
  onBack: () => void;
}

export const NotificationsSettings: React.FC<NotificationsSettingsProps> = ({
  settings,
  onSettingChange,
  onBack,
}) => {
  const notificationItems = [
    {
      key: 'permissionRequests' as keyof NotificationSettings,
      icon: 'notifications-outline',
      title: 'Permission Requests',
      subtitle: 'Get notified when sites request permissions',
      value: settings.permissionRequests,
    },
    {
      key: 'downloadComplete' as keyof NotificationSettings,
      icon: 'download-outline',
      title: 'Download Complete',
      subtitle: 'Notify when downloads finish',
      value: settings.downloadComplete,
    },
    {
      key: 'securityAlerts' as keyof NotificationSettings,
      icon: 'shield-outline',
      title: 'Security Alerts',
      subtitle: 'Important security notifications',
      value: settings.securityAlerts,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <ScrollView style={styles.content}>
        {notificationItems.map((item, index) => (
          <View key={index} style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name={item.icon as any} size={24} color="#4285f4" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
            </View>
            <Switch
              value={item.value}
              onValueChange={(value) => onSettingChange(item.key, value)}
              trackColor={{ false: '#333', true: '#4CAF50' }}
              thumbColor={item.value ? '#ffffff' : '#666'}
            />
          </View>
        ))}
      </ScrollView>
    </View>
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
});