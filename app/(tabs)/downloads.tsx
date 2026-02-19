import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  Linking,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useBrowserStore } from '@/store/browserStore';
import DownloadManager from '@/utils/downloadManager';
import { logger } from '@/utils/logger';
import { getThemeColors, colors } from '@/theme/colors';
import { useTranslation } from 'react-i18next';

interface DownloadItem {
  id: string;
  name: string;
  url: string;
  localPath?: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  dateStarted: number;
  dateCompleted?: number;
  error?: string;
}

const DownloadsScreen = React.memo(() => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { initializeDownloads, nightMode, incognitoMode } = useBrowserStore();
  
  // Get theme colors based on night mode and incognito mode
  const themeColors = getThemeColors(nightMode, incognitoMode);

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    setIsLoading(true);
    try {
      await initializeDownloads();
      // Load real downloads from storage
      const { StorageManager } = await import('@/utils/storage');
      const realDownloads = await StorageManager.getDownloads();
      setDownloads(realDownloads);
    } catch (error) {
      logger.error('Failed to load downloads', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = useCallback(async (url: string, filename: string) => {
    try {
      // Use the real DownloadManager
      const DownloadManager = (await import('@/utils/downloadManager')).default;
      
      // Initialize download manager
      await DownloadManager.initialize();
      
      // Start the download with progress tracking
      const downloadId = await DownloadManager.startDownload(
        url,
        filename,
        {},
        (progress) => {
          // Update the downloads list with the current progress
          setDownloads(prev => prev.map(d => {
            if (d.id === downloadId) {
              return {
                ...d,
                progress: Math.round(progress.progress),
                size: progress.totalBytesExpectedToWrite,
                status: progress.progress >= 100 ? 'completed' : 'downloading',
                dateCompleted: progress.progress >= 100 ? Date.now() : undefined
              };
            }
            return d;
          }));
        }
      );
      
      // Refresh the downloads list after starting the download
      const { StorageManager } = await import('@/utils/storage');
      const updatedDownloads = await StorageManager.getDownloads();
      setDownloads(updatedDownloads);
      
      Alert.alert('Download Started', `${filename} is being downloaded.`);

    } catch (error) {
      logger.error('Download resume failed', error, { filename });
      Alert.alert('Download Failed', 'Failed to download the file. Please try again.');
    }
  }, []);

  const addTestDownload = () => {
    Alert.alert(
      'Download File',
      'Choose a file type to download:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'PDF Document', 
          onPress: () => downloadFile(
            'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            'document.pdf'
          )
        },
        { 
          text: 'Image', 
          onPress: () => downloadFile(
            'https://picsum.photos/800/600.jpg',
            'image.jpg'
          )
        },
        { 
          text: 'Audio File', 
          onPress: () => downloadFile(
            'https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/11/file_example_MP3_700KB.mp3',
            'audio.mp3'
          )
        },
        { 
          text: 'Video File', 
          onPress: () => downloadFile(
            'https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/04/file_example_MP4_480_1_5MG.mp4',
            'video.mp4'
          )
        },
        { 
          text: 'ZIP Archive', 
          onPress: () => downloadFile(
            'https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/02/file_example_ZIP_1MB.zip',
            'archive.zip'
          )
        }
      ]
    );
  };

  const handleClearDownloads = () => {
    Alert.alert(
      'Clear Downloads',
      'Are you sure you want to clear all downloads?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Use the real DownloadManager to clear all downloads
              const DownloadManager = (await import('@/utils/downloadManager')).default;
              await DownloadManager.clearAllDownloads();
              
              // Refresh the downloads list
              setDownloads([]);
              Alert.alert('Downloads Cleared', 'All downloads have been cleared.');
            } catch (error) {
              logger.error('Failed to clear downloads', error);
              Alert.alert('Error', 'Failed to clear downloads. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleItemPress = (item: DownloadItem) => {
    // Use the openFile function to handle the file
    openFile(item);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const openFile = async (item: DownloadItem) => {
    if (item.status === 'completed' && item.localPath) {
      try {
        // Check if file exists
        const fileInfo = await FileSystem.getInfoAsync(item.localPath);
        
        if (fileInfo.exists) {
          // Share/open the file
          await Sharing.shareAsync(item.localPath, {
            UTI: item.type === 'image' ? 'public.image' : 
                 item.type === 'video' ? 'public.movie' : 
                 item.type === 'audio' ? 'public.audio' : 
                 item.type === 'pdf' ? 'com.adobe.pdf' : 
                 'public.data',
            mimeType: item.type === 'image' ? 'image/jpeg' :
                      item.type === 'video' ? 'video/mp4' :
                      item.type === 'audio' ? 'audio/mpeg' :
                      item.type === 'pdf' ? 'application/pdf' :
                      'application/octet-stream'
          });
        } else {
          Alert.alert('File Not Found', 'The downloaded file could not be found on your device.');
        }
      } catch (error) {
        logger.error('Error opening file', error, { filePath: item.localPath });
        Alert.alert('Error', 'Could not open file: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    } else if (item.status === 'failed') {
      Alert.alert('Download Failed', item.error || 'Unknown error occurred');
    } else {
      Alert.alert('Download in Progress', `${item.name} is still downloading (${item.progress}%)`);
    }
  };

  const deleteDownload = (item: DownloadItem) => {
    Alert.alert(
      'Delete Download',
      `Are you sure you want to delete ${item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setDownloads(downloads.filter(download => download.id !== item.id));
          }
        }
      ]
    );
  };

  const getFileIconByType = (type: string) => {
    if (type.includes('pdf')) return 'document-text-outline';
    if (type.includes('image')) return 'image-outline';
    if (type.includes('video')) return 'videocam-outline';
    if (type.includes('audio')) return 'musical-notes-outline';
    if (type.includes('zip') || type.includes('rar')) return 'archive-outline';
    return 'document-outline';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'downloading': return '#2196F3';
      case 'failed': return '#f44336';
      case 'paused': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  const renderDownloadItem = ({ item }: { item: DownloadItem }) => (
    <TouchableOpacity 
      style={styles.downloadItem}
      onPress={() => openFile(item)}
    >
      <View style={styles.downloadIcon}>
        <Ionicons 
          name={getFileIconByType(item.type)} 
          size={20} 
          color={getStatusColor(item.status)} 
        />
      </View>
      <View style={styles.downloadContent}>
        <Text style={styles.downloadTitle} numberOfLines={1}>{item.name}</Text>
        <View style={styles.downloadDetails}>
          <Text style={styles.downloadSize}>{formatFileSize(item.size)}</Text>
          <Text style={styles.downloadDate}>
            {item.dateCompleted ? formatDate(item.dateCompleted) : formatDate(item.dateStarted)}
          </Text>
        </View>
        {item.status === 'downloading' && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
            <Text style={styles.progressText}>{item.progress}%</Text>
          </View>
        )}
        {item.status === 'failed' && (
          <Text style={[styles.downloadSize, { color: '#f44336' }]}>Download Failed</Text>
        )}
      </View>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => deleteDownload(item)}
      >
        <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Helper function to determine icon based on file extension
  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'document-text-outline';
      case 'doc':
      case 'docx':
        return 'document-outline';
      case 'xls':
      case 'xlsx':
        return 'grid-outline';
      case 'ppt':
      case 'pptx':
        return 'easel-outline';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image-outline';
      case 'mp3':
      case 'wav':
      case 'ogg':
        return 'musical-note-outline';
      case 'mp4':
      case 'mov':
      case 'avi':
        return 'videocam-outline';
      case 'zip':
      case 'rar':
      case '7z':
        return 'archive-outline';
      default:
        return 'document-outline';
    }
  };

  return (
    <LinearGradient colors={themeColors.gradient} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.topBar, paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('downloads')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={addTestDownload} style={styles.addButton} accessibilityLabel="Add test download" accessibilityRole="button">
              <Ionicons name="add-outline" size={24} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearDownloads} style={styles.clearButton} accessibilityLabel="Clear all downloads" accessibilityRole="button">
              <Ionicons name="trash-outline" size={24} color="#ff6b6b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Downloads List */}
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#4285f4" />
            <Text style={styles.emptyStateText}>{t('loading')}</Text>
          </View>
        ) : downloads.length > 0 ? (
          <FlatList
            data={downloads}
            renderItem={renderDownloadItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.downloadsList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="download-outline" size={64} color="#666" />
            <Text style={styles.emptyStateText}>{t('noDownloads')}</Text>
            <Text style={styles.emptyStateSubtext}>{t('downloadsWillAppear')}</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
});

export default DownloadsScreen;

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
  addButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  clearButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  downloadsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  downloadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  downloadIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  downloadContent: {
    flex: 1,
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 4,
  },
  downloadDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  downloadSize: {
    fontSize: 12,
    color: '#aaaaaa',
  },
  downloadDate: {
    fontSize: 12,
    color: '#888',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressText: {
    position: 'absolute',
    right: 0,
    top: 6,
    fontSize: 10,
    color: '#aaaaaa',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});