import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';

interface AboutSettingsProps {
  onBack: () => void;
}

export const AboutSettings: React.FC<AboutSettingsProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Note: In a real production app, these would be hosted URLs.
  // For local HTML files in React Native/Expo, we often bundle them or fetch them.
  // Here we assume they are accessible or we use the placeholder URLs.
  const privacyUrl = 'https://sites.google.com/view/fluxobrowser-legaldocuments';
  const termsUrl = 'https://sites.google.com/view/fluxobrowser-legaldocuments/terms-of-service';

  const renderPolicyModal = (visible: boolean, setVisible: (v: boolean) => void, url: string, title: string) => (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>
        
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4285f4" />
          </View>
        )}
        
        <WebView
          source={{ uri: url }}
          style={styles.webView}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
        />
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('about')}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => setShowPrivacyModal(true)}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#4285f4" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Privacy Policy</Text>
              <Text style={styles.settingSubtitle}>How we handle your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => setShowTermsModal(true)}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="document-text-outline" size={22} color="#4285f4" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Terms of Use</Text>
              <Text style={styles.settingSubtitle}>Agreement for using the app</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>
        </View>

        <View style={styles.appInfoSection}>
          <View style={styles.logoContainer}>
             <Ionicons name="planet-outline" size={60} color="#4285f4" />
          </View>
          <Text style={styles.appName}>Fluxo Browser</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.copyright}>© 2026 Fluxo Team. All rights reserved.</Text>
        </View>
      </ScrollView>

      {renderPolicyModal(showPrivacyModal, setShowPrivacyModal, privacyUrl, 'Privacy Policy')}
      {renderPolicyModal(showTermsModal, setShowTermsModal, termsUrl, 'Terms of Use')}
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#aaaaaa',
  },
  appInfoSection: {
    alignItems: 'center',
    marginTop: 40,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  copyright: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0b1e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  webView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 11, 30, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});
