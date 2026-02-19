import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SitePermissions } from '../../types/settings';
import SitePermissionsManager from '../../utils/sitePermissionsManager';
import { logger } from '@/utils/logger';

interface SitePermissionsSettingsProps {
  settings: SitePermissions;
  onSettingChange: (key: keyof SitePermissions, value: 'ask' | 'allow' | 'block') => void;
  onBack: () => void;
}

export const SitePermissionsSettings: React.FC<SitePermissionsSettingsProps> = ({
  settings,
  onSettingChange,
  onBack,
}) => {
  const [showPermissionModal, setShowPermissionModal] = useState<keyof SitePermissions | null>(null);

  const permissionOptions = SitePermissionsManager.getPermissionOptions();
  const permissionItems = SitePermissionsManager.getPermissionItems();

  const getPermissionStatusText = (status: 'ask' | 'block' | 'allow') => {
    return SitePermissionsManager.getPermissionStatusText(status);
  };
  
  // Apply permissions when they change
  useEffect(() => {
    try {
      SitePermissionsManager.applyPermissions();
    } catch (error) {
      Alert.alert('Error', 'Failed to apply site permissions settings');
      logger.error('Failed to apply site permissions', error, { settings });
    }
  }, [settings]);

  const renderPermissionModal = () => {
    if (!showPermissionModal) return null;
    
    const permissionTitle = permissionItems.find(item => item.key === showPermissionModal)?.title || '';
    
    return (
      <Modal
        visible={!!showPermissionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPermissionModal(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{permissionTitle} permission</Text>
              <TouchableOpacity onPress={() => setShowPermissionModal(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalOptions}>
              {permissionOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    settings[showPermissionModal] === option.id && styles.selectedOption
                  ]}
                  onPress={async () => {
                    try {
                      // Update the setting through the manager
                      await SitePermissionsManager.updatePermission(
                        showPermissionModal, 
                        option.id as 'ask' | 'allow' | 'block'
                      );
                      
                      // Also update the local state through the provided callback
                      onSettingChange(showPermissionModal, option.id as 'ask' | 'allow' | 'block');
                      setShowPermissionModal(null);
                    } catch (error) {
                      Alert.alert('Error', `Failed to update ${showPermissionModal} permission`);
                      logger.error('Failed to update permission', error, { key: showPermissionModal, value: option.id });
                    }
                  }}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
                    <Ionicons name={option.icon as any} size={20} color="#fff" />
                  </View>
                  <Text style={styles.optionText}>{option.title}</Text>
                  {settings[showPermissionModal] === option.id && (
                    <Ionicons name="checkmark" size={20} color="#4285F4" style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Site Permissions</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Manage site permissions</Text>
          <Text style={styles.sectionSubtitle}>Control what information websites can access</Text>
        </View>

        {permissionItems.map((item) => (
          <TouchableOpacity 
            key={item.key} 
            style={styles.settingItem} 
            onPress={() => setShowPermissionModal(item.key)}
          >
            <View style={[styles.settingIcon, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon as any} size={24} color="#ffffff" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              <Text style={styles.settingSubtitle}>
                {getPermissionStatusText(settings[item.key])}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        ))}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#4285F4" />
          <Text style={styles.infoText}>
            These settings apply to all websites. You can also manage permissions for individual sites.
          </Text>
        </View>
      </ScrollView>

      {renderPermissionModal()}
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalOptions: {
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectedOption: {
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
  },
  checkIcon: {
    marginLeft: 8,
  },
});

export default SitePermissionsSettings;