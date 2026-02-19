import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageSettings } from '../../types/settings';
import LanguageManager from '../../utils/languageManager';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';
import i18n from '../../utils/i18n';

interface LanguageSettingsProps {
  settings: LanguageSettings;
  onSettingChange: (key: keyof LanguageSettings, value: string | boolean) => void;
  onBack: () => void;
}

export const LanguageSettingsComponent: React.FC<LanguageSettingsProps> = ({
  settings,
  onSettingChange,
  onBack,
}) => {
  const { t } = useTranslation();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const languages = LanguageManager.getSupportedLanguages();

  const getLanguageName = (code: string) => {
    return LanguageManager.getLanguageName(code);
  };
  
  // Apply language changes when the preferred language changes
  // PERFORMANCE OPTIMIZATION: Use debouncing to prevent excessive re-renders
  useEffect(() => {
    // Debounce language changes by 50ms for better performance
    const timeoutId = setTimeout(async () => {
      try {
        // Change i18n language directly
        await i18n.changeLanguage(settings.preferredLanguage);
        // Also apply through LanguageManager
        LanguageManager.applyLanguageSettings();
      } catch (error) {
        logger.error('Failed to apply language settings', error, { preferredLanguage: settings.preferredLanguage });
        Alert.alert(t('error'), t('languageChangeFailed'));
      }
    }, 50); // 50ms debounce for smooth UI response
    
    // Cleanup timeout on unmount or language change
    return () => clearTimeout(timeoutId);
  }, [settings.preferredLanguage]);

  const renderLanguageModal = () => {
    return (
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectLanguage')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.languageList}>
              {languages.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageItem,
                    settings.preferredLanguage === language.code && styles.selectedLanguage
                  ]}
                  onPress={() => {
                    onSettingChange('preferredLanguage', language.code);
                    setShowLanguageModal(false);
                  }}
                >
                  <Text style={styles.languageFlag}>{language.flag}</Text>
                  <Text style={styles.languageName}>{language.name}</Text>
                  {settings.preferredLanguage === language.code && (
                    <Ionicons name="checkmark" size={20} color="#4285F4" style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
        <Text style={styles.headerTitle}>{t('languageSettings')}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('languagePreferences')}</Text>
          <Text style={styles.sectionSubtitle}>{t('languagePreferencesDesc')}</Text>
        </View>

        <TouchableOpacity 
          style={styles.settingItem} 
          onPress={() => setShowLanguageModal(true)}
        >
          <View style={styles.settingIcon}>
            <Ionicons name="language-outline" size={24} color="#ffffff" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>{t('appLanguage')}</Text>
            <Text style={styles.settingSubtitle}>
              {getLanguageName(settings.preferredLanguage)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>

        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="globe-outline" size={24} color="#ffffff" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>{t('automaticTranslation')}</Text>
            <Text style={styles.settingSubtitle}>
              {t('automaticTranslationDesc')}
            </Text>
          </View>
          <Switch
            value={settings.translationEnabled}
            onValueChange={(value) => onSettingChange('translationEnabled', value)}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={settings.translationEnabled ? '#ffffff' : '#666'}
            ios_backgroundColor="#333"
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#4285F4" />
          <Text style={styles.infoText}>
            {t('languageInfoText')}
          </Text>
        </View>
      </ScrollView>

      {renderLanguageModal()}
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
  languageList: {
    maxHeight: 400,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectedLanguage: {
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  languageName: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
  },
  checkIcon: {
    marginLeft: 8,
  },
});

export default LanguageSettingsComponent;