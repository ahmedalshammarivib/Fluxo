import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useBrowserStore } from '../../store/browserStore';
import { BookmarkItem } from '../../utils/storage';
import { logger } from '@/utils/logger';
import { getThemeColors, colors } from '@/theme/colors';
import { useTranslation } from 'react-i18next';

// Skeleton Loader Component
const SkeletonLoader = () => {
  const animatedValue = new Animated.Value(0);

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.listContainer}>
      {[...Array(5)].map((_, index) => (
        <Animated.View key={index} style={[styles.skeletonItem, { opacity }]}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonUrl} />
            <View style={styles.skeletonMeta} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
};

// Toast Message Component
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  Alert.alert(
    type === 'success' ? '✅ Success' : '❌ Error',
    message,
    [{ text: 'OK', style: 'default' }],
    { cancelable: true }
  );
};

const BookmarksScreen = React.memo(() => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const [filteredBookmarks, setFilteredBookmarks] = useState<BookmarkItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folders, setFolders] = useState<string[]>(['default']);

  const { bookmarks, loadBookmarks, removeBookmark, updateBookmark, searchBookmarks, nightMode, incognitoMode, createNewTab, createPrivacyTab } = useBrowserStore();
  
  // Get theme colors based on night mode and incognito mode
  const themeColors = getThemeColors(nightMode, incognitoMode);

  // Load bookmarks on component mount
  useEffect(() => {
    const initializeBookmarks = async () => {
      setIsLoading(true);
      try {
        await loadBookmarks();
        setFilteredBookmarks(bookmarks);
      } catch (error) {
        logger.error('Failed to load bookmarks', error);
        Alert.alert('Error', 'Failed to load bookmarks');
      } finally {
        setIsLoading(false);
      }
    };

    initializeBookmarks();
  }, []);

  // Extract unique folders from bookmarks
  useEffect(() => {
    const uniqueFolders = ['default', ...new Set(bookmarks.map(b => b.folder).filter(f => f && f !== 'default'))];
    setFolders(uniqueFolders);
  }, [bookmarks]);

  // Update filtered bookmarks when bookmarks or filters change
  useEffect(() => {
    let filtered = bookmarks;

    // Filter by folder
    if (selectedFolder !== 'all') {
      filtered = filtered.filter(bookmark => bookmark.folder === selectedFolder);
    }

    // Filter by search query
    if (!searchQuery.trim()) {
      setFilteredBookmarks(filtered);
    }
  }, [bookmarks, searchQuery, selectedFolder]);

  // Create new folder
  const createFolder = () => {
    if (newFolderName.trim() && !folders.includes(newFolderName.trim())) {
      setFolders([...folders, newFolderName.trim()]);
      setNewFolderName('');
      setShowFolderModal(false);
      showToast(`Folder "${newFolderName.trim()}" created successfully`);
    } else {
      showToast('Please enter a valid folder name that does not already exist', 'error');
    }
  };

  // Move bookmark to folder
  const moveBookmarkToFolder = (bookmarkId: string, targetFolder: string) => {
    const bookmark = bookmarks.find(b => b.id === bookmarkId);
    if (bookmark) {
      updateBookmark(bookmarkId, { ...bookmark, folder: targetFolder });
      showToast(`Bookmark moved to folder "${targetFolder}"`);
    }
  };

  // Delete folder (moves bookmarks to default)
  const deleteFolder = (folderName: string) => {
    if (folderName === 'default') {
      Alert.alert('Error', 'Cannot delete the default folder');
      return;
    }

    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folderName}"? All bookmarks will be moved to the default folder.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Move all bookmarks from this folder to default
            bookmarks.filter(b => b.folder === folderName).forEach(bookmark => {
              updateBookmark(bookmark.id, { ...bookmark, folder: 'default' });
            });

            // Remove folder from list
            setFolders(folders.filter(f => f !== folderName));

            // Reset selected folder if it was deleted
            if (selectedFolder === folderName) {
              setSelectedFolder('all');
            }

            showToast(`Folder "${folderName}" deleted successfully`);
          }
        }
      ]
    );
  };

  // Handle search with debouncing
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        try {
          const results = await searchBookmarks(searchQuery);
          setFilteredBookmarks(results);
        } catch (error) {
          logger.error('Bookmark search failed', error, { query: searchQuery });
        } finally {
          setIsSearching(false);
        }
      } else {
        setFilteredBookmarks(bookmarks);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, searchBookmarks, bookmarks]);

  const clearBookmarks = () => {
    Alert.alert(
      'Clear Bookmarks',
      'Are you sure you want to clear all bookmarks?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all bookmarks individually
              await Promise.all(bookmarks.map(bookmark => removeBookmark(bookmark.id)));
              setFilteredBookmarks([]);
              Alert.alert('Success', 'All bookmarks have been cleared.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear bookmarks');
            }
          },
        },
      ]
    );
  };

  const handleItemPress = (url: string) => {
    // Create a new tab with the bookmark URL based on current mode
    if (incognitoMode) {
      createPrivacyTab(url);
    } else {
      createNewTab(url);
    }
    // Navigate to the browser view
    router.push({ pathname: '/(tabs)', params: { view: 'browser' } });
  };

  const handleEditBookmark = (item: BookmarkItem) => {
    Alert.alert(
      'Bookmark Options',
      `Manage "${item.title}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Folder',
          onPress: () => {
            Alert.alert(
              'Move to Folder',
              'Select a folder:',
              [
                { text: 'Cancel', style: 'cancel' },
                ...folders.map(folder => ({
                  text: folder,
                  onPress: () => moveBookmarkToFolder(item.id, folder)
                }))
              ]
            );
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeBookmark(item.id);
              setFilteredBookmarks(prev => prev.filter(b => b.id !== item.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete bookmark');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getFaviconName = (url: string): string => {
    const domain = url.toLowerCase();
    if (domain.includes('google')) return 'globe-outline';
    if (domain.includes('youtube')) return 'play-circle-outline';
    if (domain.includes('github')) return 'logo-github';
    if (domain.includes('stackoverflow')) return 'help-circle-outline';
    return 'bookmark-outline';
  };

  const renderBookmarkItem = ({ item }: { item: BookmarkItem }) => (
    <TouchableOpacity
      style={styles.bookmarkItem}
      onPress={() => handleItemPress(item.url)}
      onLongPress={() => handleEditBookmark(item)}
      accessibilityLabel={`Bookmark: ${item.title}`}
      accessibilityHint="Tap to open bookmark, long press to edit"
      accessibilityRole="button"
    >
      <View style={styles.iconContainer}>
        <Ionicons name={getFaviconName(item.url) as keyof typeof Ionicons.glyphMap} size={24} color="#007AFF" />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.itemUrl} numberOfLines={1}>
          {item.url}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={styles.itemFolder}>{item.folder}</Text>
          <Text style={styles.itemDate}>• {formatDate(item.dateAdded)}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => handleEditBookmark(item)}
        accessibilityLabel="More options"
        accessibilityHint="Open bookmark options menu"
        accessibilityRole="button"
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={themeColors.gradient} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('bookmarks')}</Text>
          <TouchableOpacity onPress={clearBookmarks} style={styles.clearButton} accessibilityLabel="Clear all bookmarks" accessibilityRole="button">
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
                    placeholder={t('searchBookmarks')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {(isSearching || searchQuery.length > 0) && (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setSearchQuery('')}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="#999" />
            ) : (
              <Ionicons name="close-circle" size={20} color="#999" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Folder Management */}
      <View style={styles.folderContainer}>
        <View style={styles.folderHeader}>
          <Text style={styles.folderTitle}>Folders</Text>
          <TouchableOpacity
            style={styles.addFolderButton}
            onPress={() => setShowFolderModal(true)}
          >
            <Ionicons name="add" size={20} color="#007AFF" />
            <Text style={styles.addFolderText}>New Folder</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.folderTabs}>
          <TouchableOpacity
            style={[styles.folderTab, selectedFolder === 'all' && styles.activeFolderTab]}
            onPress={() => setSelectedFolder('all')}
          >
            <Text style={[styles.folderTabText, selectedFolder === 'all' && styles.activeFolderTabText]}>
              All ({bookmarks.length})
            </Text>
          </TouchableOpacity>

          {folders.map(folder => {
            const folderCount = bookmarks.filter(b => b.folder === folder).length;
            return (
              <TouchableOpacity
                key={folder}
                style={[styles.folderTab, selectedFolder === folder && styles.activeFolderTab]}
                onPress={() => setSelectedFolder(folder)}
                onLongPress={() => folder !== 'default' && deleteFolder(folder)}
              >
                <Text style={[styles.folderTabText, selectedFolder === folder && styles.activeFolderTabText]}>
                  {folder} ({folderCount})
                </Text>
                {folder !== 'default' && (
                  <TouchableOpacity
                    style={styles.deleteFolderButton}
                    onPress={() => deleteFolder(folder)}
                  >
                    <Ionicons name="close-circle" size={16} color="#ff6b6b" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* New Folder Modal */}
      {showFolderModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Folder</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter folder name"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowFolderModal(false);
                  setNewFolderName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={createFolder}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {isLoading ? (
        <SkeletonLoader />
      ) : filteredBookmarks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bookmark-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>{t('noBookmarks')}</Text>
          <Text style={styles.emptySubtext}>{t('startBookmarking')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookmarks}
          renderItem={renderBookmarkItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0b1e',
  },
  header: {
    // paddingTop is now handled dynamically using insets.top
    paddingBottom: 15,
    paddingHorizontal: 15,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  bookmarkItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 5,
    padding: 15,
    elevation: 1,
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 15,
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 3,
  },
  itemUrl: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  itemFolder: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  moreButton: {
    padding: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  folderContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    padding: 15,
    elevation: 1,
  },
  folderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  folderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addFolderText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  folderTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  folderTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  activeFolderTab: {
    backgroundColor: '#007AFF',
  },
  folderTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFolderTabText: {
    color: '#fff',
  },
  deleteFolderButton: {
    marginLeft: 6,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  // Skeleton Loading Styles
  skeletonItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 5,
    padding: 15,
    elevation: 1,
    alignItems: 'center',
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginRight: 15,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonTitle: {
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  skeletonUrl: {
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 6,
    width: '90%',
  },
  skeletonMeta: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    width: '40%',
  },
});

export default BookmarksScreen;