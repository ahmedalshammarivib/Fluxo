import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DownloadSettings } from '../../types/settings';

interface DownloadsSettingsProps {
  settings: DownloadSettings;
  onSettingChange: (key: keyof DownloadSettings, value: string | boolean) => void;
  onBack: () => void;
}

export const DownloadsSettingsComponent: React.FC<DownloadsSettingsProps> = ({
  settings,
  onSettingChange,
  onBack,
}) => {
  const [customPath, setCustomPath] = useState(settings.downloadPath || '');
  const [isEditingPath, setIsEditingPath] = useState(false);

  const handleSaveCustomPath = () => {
    if (customPath.trim()) {
      onSettingChange('downloadPath', customPath.trim());
      setIsEditingPath(false);
    } else {
      Alert.alert('Invalid Path', 'Please enter a valid download path');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Download Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Download Options</Text>
          <Text style={styles.sectionSubtitle}>Configure how files are downloaded and stored</Text>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="folder-outline" size={24} color="#ffffff" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Download Location</Text>
            {isEditingPath ? (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={customPath}
                  onChangeText={setCustomPath}
                  placeholder="Enter download path"
                  placeholderTextColor="#888"
                />
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleSaveCustomPath}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pathContainer}>
                <Text style={styles.settingSubtitle}>
                  {settings.downloadPath || 'Default location'}
                </Text>
                <TouchableOpacity 
                  onPress={() => setIsEditingPath(true)}
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="cloud-download-outline" size={24} color="#ffffff" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Ask Before Downloading</Text>
            <Text style={styles.settingSubtitle}>
              Confirm before downloading files
            </Text>
          </View>
          <Switch
            value={settings.askBeforeDownloading}
            onValueChange={(value) => onSettingChange('askBeforeDownloading', value)}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={settings.askBeforeDownloading ? '#ffffff' : '#666'}
            ios_backgroundColor="#333"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="wifi-outline" size={24} color="#ffffff" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Download on Wi-Fi Only</Text>
            <Text style={styles.settingSubtitle}>
              Only download files when connected to Wi-Fi
            </Text>
          </View>
          <Switch
            value={settings.downloadOnWifiOnly}
            onValueChange={(value) => onSettingChange('downloadOnWifiOnly', value)}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={settings.downloadOnWifiOnly ? '#ffffff' : '#666'}
            ios_backgroundColor="#333"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="save-outline" size={24} color="#ffffff" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Auto-Save Media Files</Text>
            <Text style={styles.settingSubtitle}>
              Automatically save images and videos to gallery
            </Text>
          </View>
          <Switch
            value={settings.autoSaveMedia}
            onValueChange={(value) => onSettingChange('autoSaveMedia', value)}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={settings.autoSaveMedia ? '#ffffff' : '#666'}
            ios_backgroundColor="#333"
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#4285F4" />
          <Text style={styles.infoText}>
            Downloaded files are stored in your device's storage. You can access them through the Downloads section in the browser or through your device's file manager.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.testDownloadButton}
          onPress={async () => {
            try {
              Alert.alert(
                'Test Download',
                'Select a file type to test download',
                [
                  {
                    text: 'PDF Document',
                    onPress: async () => {
                      try {
                        const DownloadManager = (await import('../../utils/downloadManager')).default;
                        await DownloadManager.downloadFromWebView('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
                        Alert.alert('Success', 'Download started. Check the Downloads tab to view progress.');
                      } catch (error) {
                        Alert.alert('Error', 'Failed to start download');
                      }
                    }
                  },
                  {
                    text: 'Image',
                    onPress: async () => {
                      try {
                        const DownloadManager = (await import('../../utils/downloadManager')).default;
                        await DownloadManager.downloadFromWebView('https://picsum.photos/800/600');
                        Alert.alert('Success', 'Download started. Check the Downloads tab to view progress.');
                      } catch (error) {
                        Alert.alert('Error', 'Failed to start download');
                      }
                    }
                  },
                  {
                    text: 'Audio File',
                    onPress: async () => {
                      try {
                        const DownloadManager = (await import('../../utils/downloadManager')).default;
                        await DownloadManager.downloadFromWebView('https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/11/file_example_MP3_700KB.mp3');
                        Alert.alert('Success', 'Download started. Check the Downloads tab to view progress.');
                      } catch (error) {
                        Alert.alert('Error', 'Failed to start download');
                      }
                    }
                  },
                  {
                    text: 'Video File',
                    onPress: async () => {
                      try {
                        const DownloadManager = (await import('../../utils/downloadManager')).default;
                        await DownloadManager.downloadFromWebView('https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/04/file_example_MP4_480_1_5MG.mp4');
                        Alert.alert('Success', 'Download started. Check the Downloads tab to view progress.');
                      } catch (error) {
                        Alert.alert('Error', 'Failed to start download');
                      }
                    }
                  },
                  {
                    text: 'ZIP Archive',
                    onPress: async () => {
                      try {
                        const DownloadManager = (await import('../../utils/downloadManager')).default;
                        await DownloadManager.downloadFromWebView('https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/02/file_example_ZIP_500kB.zip');
                        Alert.alert('Success', 'Download started. Check the Downloads tab to view progress.');
                      } catch (error) {
                        Alert.alert('Error', 'Failed to start download');
                      }
                    }
                  },
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  }
                ]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to initialize download test');
            }
          }}
        >
          <View style={styles.testDownloadContent}>
            <Ionicons name="cloud-download-outline" size={24} color="#ffffff" />
            <Text style={styles.testDownloadText}>Test Download Function</Text>
          </View>
        </TouchableOpacity>
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
  pathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButtonText: {
    color: '#4285F4',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#333',
    color: '#ffffff',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
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
  testDownloadButton: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  testDownloadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testDownloadText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
});

export default DownloadsSettingsComponent;