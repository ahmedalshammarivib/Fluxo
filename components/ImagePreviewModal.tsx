import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  Share,
  Clipboard,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { logger } from '@/utils/logger';
import DownloadManager from '@/utils/downloadManager';
import { responsiveFontSize, responsiveIconSize, responsiveSpacing } from '@/utils/responsive';
import useImageLoader from '@/hooks/useImageLoader';

interface ImagePreviewModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
  onOpenInNewTab?: (url: string) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

// Force component to completely remount when imageUrl changes
const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  visible,
  imageUrl,
  onClose,
  onOpenInNewTab,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  
  const { imageData, isLoaded, error: loadError, loadImage, clearCache } = useImageLoader();
  const [loadAttemptId, setLoadAttemptId] = useState(0);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  // Use ScrollView ref for zoom control
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      clearCache();
      setLoadAttemptId(prev => prev + 1);
      
      // Reset zoom
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
      }

      if (imageUrl) {
        // Sanitize URL to prevent errors with whitespace or newlines
        const sanitizedUrl = imageUrl.trim().replace(/['"`]/g, '');
        
        loadImage(sanitizedUrl).then(loadedUrl => {
          if (loadedUrl) {
            Image.getSize(
              loadedUrl,
              (width, height) => {
                logger.debug('Got image dimensions', { width, height, url: loadedUrl });
                
                const aspectRatio = width / height;
                let displayWidth = windowWidth;
                let displayHeight = displayWidth / aspectRatio;
                
                // If height is too tall, fit to height
                if (displayHeight > windowHeight * 0.8) {
                  displayHeight = windowHeight * 0.8;
                  displayWidth = displayHeight * aspectRatio;
                }
                
                setImageSize({ width: displayWidth, height: displayHeight });
              },
              (error) => {
                logger.warn('Failed to get image dimensions, using fallback', { url: loadedUrl });
                
                const fallbackWidth = windowWidth * 0.9;
                const fallbackHeight = windowHeight * 0.6;
                setImageSize({ width: fallbackWidth, height: fallbackHeight });
              }
            );
          }
        });
      }
    }
  }, [visible, imageUrl, loadImage, clearCache, windowWidth, windowHeight]);

  const handleDownload = async () => {
    try {
      await DownloadManager.downloadFromWebView(imageUrl, `image_${Date.now()}.jpg`);
      Alert.alert('Success', 'Image download started');
    } catch (error) {
      logger.error('Image download failed', error, { imageUrl });
      Alert.alert('Error', 'Failed to download image');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        url: imageUrl,
        message: 'Check out this image!',
        title: 'Share Image'
      });
    } catch (error) {
      logger.error('Image share failed', error, { imageUrl });
      Alert.alert('Error', 'Failed to share image');
    }
  };

  const handleCopyUrl = () => {
    Clipboard.setString(imageUrl);
    Alert.alert('Copied', 'Image URL copied to clipboard');
  };

  const handleSearchImage = () => {
    const searchUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`;
    if (onOpenInNewTab) {
      onOpenInNewTab(searchUrl);
      onClose();
    }
  };

  const handleRetry = () => {
    logger.info('Retrying image load', { imageUrl });
    setLoadAttemptId(prev => prev + 1);
    loadImage(imageUrl); // Reload
  };

  // Don't render anything if not visible
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: '#000000' }]} key={`modal_${loadAttemptId}`}>
        <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" translucent />
        <LinearGradient
          colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0.98)', 'rgba(0,0,0,1)']}
          style={styles.background}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={responsiveIconSize(24)} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>
              Image Preview
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                <Ionicons name="share-outline" size={responsiveIconSize(24)} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDownload} style={styles.actionButton}>
                <Ionicons name="download-outline" size={responsiveIconSize(24)} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Image Container with Zoom */}
          <View style={styles.imageWrapper}>
            {!isLoaded && !loadError && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingText}>Loading image...</Text>
              </View>
            )}
            
            {loadError && (
              <View style={styles.errorContainer}>
                <Ionicons name="image-outline" size={responsiveIconSize(64)} color="#666" />
                <Text style={styles.errorText}>Failed to load image</Text>
                <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {imageData && !loadError && (
              <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                centerContent
              >
                <Image
                  key={`img_${loadAttemptId}`}
                  source={{ uri: imageData }}
                  style={{
                    width: imageSize.width,
                    height: imageSize.height,
                  }}
                  resizeMode="contain"
                />
              </ScrollView>
            )}
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleCopyUrl} style={styles.footerButton}>
              <Ionicons name="copy-outline" size={responsiveIconSize(20)} color="#ffffff" />
              <Text style={styles.footerButtonText}>Copy URL</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSearchImage} style={styles.footerButton}>
              <Ionicons name="search-outline" size={responsiveIconSize(20)} color="#ffffff" />
              <Text style={styles.footerButtonText}>Search Lens</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
    zIndex: 999,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 40,
    paddingBottom: 10,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    flex: 1,
    color: '#ffffff',
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 10,
    fontSize: responsiveFontSize(14),
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ffffff',
    marginTop: 10,
    fontSize: responsiveFontSize(16),
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerButton: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: 10,
  },
  footerButtonText: {
    color: '#ffffff',
    marginLeft: 8,
    fontSize: responsiveFontSize(14),
  },
});

export default ImagePreviewModal;
