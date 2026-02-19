import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Modal,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrivacySettings } from '../../types/settings';
import { useBrowserStore } from '../../store/browserStore';
import { StorageManager } from '../../utils/storage';

interface PrivacySecuritySettingsProps {
  settings: PrivacySettings;
  onSettingChange: (key: keyof PrivacySettings, value: string | boolean) => void;
  onBack: () => void;
}

export const PrivacySecuritySettings: React.FC<PrivacySecuritySettingsProps> = ({
  settings,
  onSettingChange,
  onBack,
}) => {
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showSafeBrowsingModal, setShowSafeBrowsingModal] = useState(false);
  const [showDNSModal, setShowDNSModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  
  const { clearHistory, loadHistory } = useBrowserStore();

  const handleClearBrowsingData = () => {
    setSelectedDataTypes([]);
    setShowClearDataModal(true);
  };

  const toggleDataType = (dataType: string) => {
    setSelectedDataTypes(prev => 
      prev.includes(dataType) 
        ? prev.filter(t => t !== dataType)
        : [...prev, dataType]
    );
  };

  const confirmClearData = async () => {
    if (selectedDataTypes.length === 0) {
      Alert.alert('Select Data', 'Please select at least one data type to clear.');
      return;
    }
    
    Alert.alert(
      'Clear Browsing Data',
      `This will clear: ${selectedDataTypes.join(', ')}. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              // Clear selected data types
              for (const dataType of selectedDataTypes) {
                switch (dataType) {
                  case 'History':
                    await clearHistory();
                    await loadHistory();
                    break;
                  case 'Cookies':
                    // In React Native WebView, cookies are managed by the OS
                    // We can clear the stored session data
                    await StorageManager.removeItem('session_cookies');
                    break;
                  case 'Cache':
                    // Clear cached data
                    await StorageManager.removeItem('page_cache');
                    await StorageManager.removeItem('image_cache');
                    break;
                  case 'Site data':
                    // Clear site-specific data
                    await StorageManager.removeItem('site_permissions_cache');
                    await StorageManager.removeItem('site_settings');
                    break;
                  case 'Downloads':
                    // Clear downloads list
                    await StorageManager.setItem('downloads', []);
                    break;
                }
              }
              
              setIsClearing(false);
              setShowClearDataModal(false);
              Alert.alert('Success', 'Selected browsing data has been cleared.');
            } catch (error) {
              setIsClearing(false);
              Alert.alert('Error', 'Failed to clear some data. Please try again.');
            }
          },
        },
      ]
    );
  };

  const safeBrowsingOptions = [
    { id: 'off', title: 'No protection', subtitle: 'Not recommended' },
    { id: 'standard', title: 'Standard protection', subtitle: 'Protects against dangerous sites' },
    { id: 'enhanced', title: 'Enhanced protection', subtitle: 'More protection with Google services' },
  ];

  const dnsProviders = [
    { id: 'automatic', name: 'Automatic', description: 'Use system DNS' },
    { id: 'cloudflare', name: 'Cloudflare', description: '1.1.1.1' },
    { id: 'google', name: 'Google', description: '8.8.8.8' },
    { id: 'quad9', name: 'Quad9', description: '9.9.9.9' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy and security</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Clear Browsing Data */}
        <TouchableOpacity style={styles.settingItem} onPress={handleClearBrowsingData}>
          <View style={styles.settingIcon}>
            <Ionicons name="trash-outline" size={24} color="#ff4444" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Clear browsing data</Text>
            <Text style={styles.settingSubtitle}>Clear history, cookies, site data, cache...</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>

        {/* Safe Browsing */}
        <TouchableOpacity style={styles.settingItem} onPress={() => setShowSafeBrowsingModal(true)}>
          <View style={styles.settingIcon}>
            <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Safe Browsing</Text>
            <Text style={styles.settingSubtitle}>
              {settings.safeBrowsing === 'enhanced' ? 'Enhanced protection is on' : 
               settings.safeBrowsing === 'standard' ? 'Standard protection is on' : 
               'Protection is off'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>

        {/* HTTPS-First Mode */}
        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="lock-closed" size={24} color="#4285f4" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Always use secure connections</Text>
            <Text style={styles.settingSubtitle}>
              Upgrade navigations to HTTPS and warn you before loading sites that don't support it
            </Text>
          </View>
          <Switch
            value={settings.httpsFirst}
            onValueChange={(value) => onSettingChange('httpsFirst', value)}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={settings.httpsFirst ? '#ffffff' : '#666'}
          />
        </View>

        {/* Payment Method Detection */}
        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="card" size={24} color="#4285f4" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Access payment methods</Text>
            <Text style={styles.settingSubtitle}>
              Allow sites to check if you have payment methods saved
            </Text>
          </View>
          <Switch
            value={settings.paymentMethodDetection}
            onValueChange={(value) => onSettingChange('paymentMethodDetection', value)}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={settings.paymentMethodDetection ? '#ffffff' : '#666'}
          />
        </View>

        {/* Preload Pages */}
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="flash" size={24} color="#4285f4" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Preload pages</Text>
            <Text style={styles.settingSubtitle}>Standard preloading</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>

        {/* Secure DNS */}
        <TouchableOpacity style={styles.settingItem} onPress={() => setShowDNSModal(true)}>
          <View style={styles.settingIcon}>
            <Ionicons name="server" size={24} color="#4285f4" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Use secure DNS</Text>
            <Text style={styles.settingSubtitle}>
              {settings.secureDNS === 'automatic' ? 'Automatic' : settings.secureDNS}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>

        {/* Do Not Track */}
        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="eye-off" size={24} color="#4285f4" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Send a 'Do Not Track' request</Text>
            <Text style={styles.settingSubtitle}>
              {settings.doNotTrack ? 'On' : 'Off'}
            </Text>
          </View>
          <Switch
            value={settings.doNotTrack}
            onValueChange={(value) => onSettingChange('doNotTrack', value)}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={settings.doNotTrack ? '#ffffff' : '#666'}
          />
        </View>

        {/* Privacy Sandbox */}
        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="cube" size={24} color="#4285f4" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Privacy Sandbox</Text>
            <Text style={styles.settingSubtitle}>
              Trial features are {settings.privacySandbox ? 'on' : 'off'}
            </Text>
          </View>
          <Switch
            value={settings.privacySandbox}
            onValueChange={(value) => onSettingChange('privacySandbox', value)}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={settings.privacySandbox ? '#ffffff' : '#666'}
          />
        </View>

        {/* Phone as Security Key */}
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="phone-portrait" size={24} color="#4285f4" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Phone as a security key</Text>
            <Text style={styles.settingSubtitle}>
              Control which devices can sign in by using this device as a security key
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>
      </ScrollView>

      {/* Clear Data Modal */}
      <Modal visible={showClearDataModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Clear browsing data</Text>
              <TouchableOpacity onPress={() => setShowClearDataModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>Select data to clear:</Text>
              
              {['History', 'Cookies', 'Cache', 'Site data', 'Downloads'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.dataTypeItem,
                    selectedDataTypes.includes(item) && styles.selectedDataType
                  ]}
                  onPress={() => toggleDataType(item)}
                >
                  <View style={styles.checkboxContainer}>
                    <Ionicons 
                      name={selectedDataTypes.includes(item) ? "checkbox" : "square-outline"} 
                      size={24} 
                      color={selectedDataTypes.includes(item) ? "#4CAF50" : "#888"} 
                    />
                  </View>
                  <Text style={styles.dataTypeText}>{item}</Text>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity 
                style={[
                  styles.clearButton,
                  selectedDataTypes.length === 0 && styles.clearButtonDisabled
                ]}
                onPress={confirmClearData}
                disabled={isClearing}
              >
                {isClearing ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.clearButtonText}>
                    Clear Selected ({selectedDataTypes.length})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Safe Browsing Modal */}
      <Modal visible={showSafeBrowsingModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Safe Browsing</Text>
              <TouchableOpacity onPress={() => setShowSafeBrowsingModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              {safeBrowsingOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    settings.safeBrowsing === option.id && styles.selectedOption
                  ]}
                  onPress={() => {
                    onSettingChange('safeBrowsing', option.id as any);
                    setShowSafeBrowsingModal(false);
                  }}
                >
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>
                  {settings.safeBrowsing === option.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* DNS Modal */}
      <Modal visible={showDNSModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Secure DNS</Text>
              <TouchableOpacity onPress={() => setShowDNSModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              {dnsProviders.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.optionItem,
                    settings.secureDNS === provider.id && styles.selectedOption
                  ]}
                  onPress={() => {
                    onSettingChange('secureDNS', provider.id);
                    setShowDNSModal(false);
                  }}
                >
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>{provider.name}</Text>
                    <Text style={styles.optionSubtitle}>{provider.description}</Text>
                  </View>
                  {settings.secureDNS === provider.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  modalSubtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 20,
  },
  dataTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  dataTypeText: {
    fontSize: 16,
    color: '#ffffff',
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
  selectedDataType: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  clearButton: {
    backgroundColor: '#ff4444',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonDisabled: {
    backgroundColor: '#666',
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});