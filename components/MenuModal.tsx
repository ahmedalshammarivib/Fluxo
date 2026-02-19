import React, { useState, useEffect } from 'react';
import {
  Modal,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Share,
  Alert,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useBrowserStore } from '@/store/browserStore';
import { router } from 'expo-router';
import { logger } from '@/utils/logger';
import { getThemeColors, colors } from '@/theme/colors';
import { useTranslation } from 'react-i18next';
import {
  responsiveSpacing,
  responsiveFontSize,
  responsiveIconSize,
  responsiveWidth,
  responsiveHeight,
  responsiveBorderRadius,
  isSmallScreen,
  isLargeScreen,
  wp,
  hp,
  BREAKPOINTS
} from '../utils/responsive';

interface MenuModalProps {
  visible: boolean;
  onClose: () => void;
  currentUrl?: string;
  onFindInPage?: () => void;
  isBrowsingMode?: boolean;
}

export const MenuModal: React.FC<MenuModalProps> = ({ visible, onClose, currentUrl = 'https://google.com', onFindInPage, isBrowsingMode = false }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [showFindInPage, setShowFindInPage] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const { 
    nightMode, 
    toggleNightMode, 
    incognitoMode, 
    toggleIncognitoMode,
    desktopMode,
    toggleDesktopMode,
    addBookmark,
    bookmarks,
    // New: Privacy tabs integration
    createPrivacyTab,
    setTabsViewMode,
    getPrivacyTabsCount,
  } = useBrowserStore();

  // Get theme colors based on night mode and incognito mode
  const themeColors = getThemeColors(nightMode, incognitoMode, isBrowsingMode);

  const handleShare = async () => {
    try {
      // Don't close modal until share is complete
      const result = await Share.share({
        message: `Check out this page: ${currentUrl}`,
        url: currentUrl,
        title: 'Share this page'
      });
      
      if (result.action === Share.sharedAction) {
        // Only close if sharing was successful
        onClose();
      }
    } catch (error) {
      logger.error('Share error', error, { url: currentUrl });
      Alert.alert('Error', 'Something went wrong while sharing');
    }
  };

  // Consolidated navigation handler
  const navigateTo = (destination: string) => {
    onClose();
    
    switch (destination) {
      case 'Settings':
        router.push('/(tabs)/settings');
        break;
      case 'History':
        router.push('/(tabs)/history');
        break;
      case 'Downloads':
        router.push('/(tabs)/downloads');
        break;
      case 'Bookmarks':
        router.push('/(tabs)/bookmarks');
        break;
      case 'AdBlocker':
        router.push('/(tabs)/adBlocker');
        break;
      default:
        // FIXED: Removed debug console.log for production
        break;
    }
  };

  const handleFindInPage = () => {
    onClose();
    if (onFindInPage) {
      onFindInPage();
    }
  };

  // Check if URL is already bookmarked
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  useEffect(() => {
    // Check if current URL is already bookmarked
    const checkIfBookmarked = () => {
      if (!currentUrl || !bookmarks) return;
      const normalizedCurrentUrl = currentUrl.replace(/\/$/, '');
      const found = bookmarks.some(bookmark => {
        const normalizedBookmarkUrl = bookmark.url.replace(/\/$/, '');
        return normalizedBookmarkUrl === normalizedCurrentUrl;
      });
      setIsBookmarked(found);
    };
    
    checkIfBookmarked();
  }, [currentUrl, bookmarks, visible]);

  const handleAddBookmark = async () => {
    try {
      if (isBookmarked) {
        // Find the bookmark to remove
        const normalizedCurrentUrl = currentUrl.replace(/\/$/, '');
        const bookmarkToRemove = bookmarks.find(bookmark => {
          const normalizedBookmarkUrl = bookmark.url.replace(/\/$/, '');
          return normalizedBookmarkUrl === normalizedCurrentUrl;
        });
        
        if (bookmarkToRemove) {
          await useBrowserStore.getState().removeBookmark(bookmarkToRemove.id);
          setIsBookmarked(false);
          Alert.alert(
            'Bookmark Removed',
            `"${bookmarkToRemove.title}" has been removed from your bookmarks.`,
            [{ text: 'OK' }]
          );
        }
      } else {
        // Extract title from URL or use URL as title
        let title = currentUrl;
        try {
          if (currentUrl.includes('://')) {
            const url = new URL(currentUrl);
            title = url.hostname.replace('www.', '');
          }
        } catch (e) {
          logger.error('Error parsing URL', e, { url: currentUrl });
        }
        
        await addBookmark({
          title: title,
          url: currentUrl,
          folder: 'default'
        });
        
        setIsBookmarked(true);
        Alert.alert(
          'Bookmark Added',
          `"${title}" has been added to your bookmarks.`,
          [{ text: 'OK' }]
        );
      }
      
      // Don't close the modal to show the updated state
    } catch (error) {
      logger.error('Bookmark error', error, { url: currentUrl });
      Alert.alert(
        'Error',
        'Failed to update bookmark. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle incognito toggle with privacy tab integration
  const handleIncognitoToggle = async () => {
    if (!incognitoMode) {
      // Turning ON incognito mode
      await toggleIncognitoMode();
      setTabsViewMode('privacy');
      
      // Create a privacy tab if none exist
      if (getPrivacyTabsCount() === 0) {
        createPrivacyTab();
      }
      
      // Close modal and navigate to home
      onClose();
      router.push('/');
    } else {
      // Turning OFF incognito mode - just toggle and switch to normal mode
      await toggleIncognitoMode();
      setTabsViewMode('normal');
    }
  };

  // Flattened menu items without sections for cleaner design
  const menuItems = [
    { 
      icon: isBookmarked ? 'bookmark' : 'bookmark-outline', 
      title: isBookmarked ? t('removeBookmark') : t('addBookmark'), 
      active: isBookmarked, 
      onPress: handleAddBookmark 
    },
    { icon: 'moon-outline', title: t('nightMode'), active: nightMode, onPress: toggleNightMode },
    { icon: 'shield-checkmark-outline', title: t('adBlocker'), active: false, onPress: () => navigateTo('AdBlocker') },
    { icon: 'desktop-outline', title: t('requestDesktop'), active: desktopMode, onPress: toggleDesktopMode },
    { icon: 'settings-outline', title: t('settings'), active: false, onPress: () => navigateTo('Settings') },
    { icon: 'eye-off-outline', title: t('incognito'), active: incognitoMode, onPress: handleIncognitoToggle },
    { icon: 'search-outline', title: t('findInPage'), active: showFindInPage, onPress: handleFindInPage },
    { icon: 'share-outline', title: t('share'), active: false, onPress: handleShare },
    { icon: 'time-outline', title: t('history'), active: false, onPress: () => navigateTo('History') },
    { icon: 'bookmark-outline', title: t('bookmarks'), active: false, onPress: () => navigateTo('Bookmarks') },
    { icon: 'download-outline', title: t('downloads'), active: false, onPress: () => navigateTo('Downloads') },
  ];

  const itemsPerRow = screenWidth > BREAKPOINTS.md ? 4 : 3;
  const itemWidthPercent = `${100 / itemsPerRow}%`;

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
      presentationStyle="overFullScreen"
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          style={[
            styles.modalWrapper,
            { 
              maxHeight: screenHeight * 0.8,
              backgroundColor: themeColors.gradient[1] || '#1a1b3a'
            }
          ]}
        >
          <LinearGradient 
            colors={themeColors.gradient} 
            style={[
              styles.modalContainer, 
              { 
                paddingBottom: Math.max(insets.bottom, responsiveSpacing(10)) + 50,
                marginBottom: -50,
                backgroundColor: themeColors.gradient[1] || '#1a1b3a'
              }
            ]}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
              <View style={styles.headerTitleContainer}>
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('menu')}</Text>
                {incognitoMode && (
                  <View style={styles.modeIndicator}>
                    <Ionicons name="eye-off" size={12} color="#ff6b6b" />
                    <Text style={styles.modeIndicatorText}>{t('incognito')}</Text>
                  </View>
                )}
                {nightMode && !incognitoMode && (
                  <View style={styles.modeIndicator}>
                    <Ionicons name="moon" size={12} color="#f5a623" />
                    <Text style={[styles.modeIndicatorText, { color: '#f5a623' }]}>{t('nightMode')}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: themeColors.card }]}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            {/* Menu Content */}
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              bounces={false}
            >
              <View style={styles.content}>
                {menuItems && menuItems.length > 0 ? (
                  <View style={styles.menuGrid}>
                    {menuItems.map((item, itemIndex) => (
                      <View 
                        key={itemIndex}
                        style={[styles.menuItemWrapper, { width: itemWidthPercent as any }]}
                      >
                        <TouchableOpacity
                          style={[
                            styles.menuItem, 
                            item.active && styles.activeMenuItem,
                            { backgroundColor: themeColors.card }
                          ]}
                          onPress={item.onPress}
                        >
                          <View style={styles.menuIcon}>
                            <Ionicons 
                              name={item.icon as any} 
                              size={responsiveIconSize(24)} 
                              color={item.active ? '#4CAF50' : themeColors.text} 
                            />
                          </View>
                          <Text style={[styles.menuText, item.active && styles.activeMenuText, { color: themeColors.text }]} numberOfLines={1}>
                            {item.title}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: themeColors.text }]}>No menu items available</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </LinearGradient>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    width: '100%',
    backgroundColor: 'transparent',
    borderTopLeftRadius: responsiveBorderRadius(24),
    borderTopRightRadius: responsiveBorderRadius(24),
    overflow: 'hidden',
  },
  modalContainer: {
    width: '100%',
    borderTopLeftRadius: responsiveBorderRadius(24),
    borderTopRightRadius: responsiveBorderRadius(24),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    overflow: 'hidden',
    borderBottomWidth: 0,
    borderColor: 'transparent',
    borderWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: responsiveSpacing(20),
    paddingVertical: responsiveSpacing(16),
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerTitleContainer: {
    flex: 1,
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  modeIndicatorText: {
    fontSize: responsiveFontSize(10),
    color: '#ff6b6b',
    fontWeight: '600',
  },
  closeButton: {
    width: responsiveWidth(32),
    height: responsiveHeight(32),
    borderRadius: responsiveBorderRadius(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: responsiveSpacing(16),
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -responsiveSpacing(4),
  },
  menuItemWrapper: {
    padding: responsiveSpacing(4),
    marginBottom: responsiveSpacing(8),
  },
  menuItem: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: responsiveBorderRadius(16),
    padding: responsiveSpacing(12),
    alignItems: 'center',
    justifyContent: 'center',
    height: responsiveHeight(85),
  },
  activeMenuItem: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  menuIcon: {
    marginBottom: responsiveSpacing(6),
  },
  menuText: {
    fontSize: responsiveFontSize(11),
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
    width: '100%',
  },
  activeMenuText: {
    color: '#4CAF50',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: responsiveSpacing(40),
  },
  emptyText: {
    color: '#ffffff',
    fontSize: responsiveFontSize(16),
    textAlign: 'center',
  },
});