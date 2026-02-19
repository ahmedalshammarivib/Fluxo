import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageManager } from '../utils/storage';
import { logger } from '@/utils/logger';
import { GoogleIcon } from './icons/GoogleIcon';
import { ChatGPTIcon } from './icons/ChatGPTIcon';
import {
  responsiveSpacing,
  responsiveFontSize,
  responsiveIconSize,
  responsiveWidth,
  responsiveHeight,
  responsiveBorderRadius,
  getItemsPerRow,
  isSmallScreen,
  wp
} from '../utils/responsive';

interface Site {
  name: string;
  url: string;
  icon: keyof typeof Ionicons.glyphMap | React.FC<{ size?: number; color?: string }>;
  color: string;
  isCustom?: boolean;
}

interface QuickAccessGridProps {
  onSitePress: (url: string) => void;
}

export const QuickAccessGrid: React.FC<QuickAccessGridProps> = ({ onSitePress }) => {
  const { width } = useWindowDimensions();
  const itemsPerRow = getItemsPerRow(width);

  const [sites, setSites] = React.useState<Site[]>([
    { name: 'Google', url: 'https://google.com', icon: GoogleIcon, color: '#4285F4' },
    { name: 'Gmail', url: 'https://gmail.com', icon: 'mail', color: '#EA4335' },
    { name: 'YouTube', url: 'https://youtube.com', icon: 'logo-youtube', color: '#FF0000' },
    { name: 'Gemini', url: 'https://gemini.google.com', icon: 'sparkles', color: '#078EFA' },
    { name: 'ChatGPT', url: 'https://chat.openai.com', icon: ChatGPTIcon, color: '#00A67E' },
    { name: 'Facebook', url: 'https://facebook.com', icon: 'logo-facebook', color: '#1877F2' },
    { name: 'Instagram', url: 'https://instagram.com', icon: 'logo-instagram', color: '#E4405F' },
    { name: 'X', url: 'https://x.com', icon: 'logo-twitter', color: '#1DA1F2' },
  ]);

  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newSite, setNewSite] = React.useState({
    name: '',
    url: '',
  });

  React.useEffect(() => {
    loadCustomSites();
  }, []);

  const loadCustomSites = async () => {
    try {
      const customSites = await StorageManager.getItem<Site[]>('custom_sites', []);
      setSites(prev => [...prev.filter(s => !s.isCustom), ...customSites]);
    } catch (error) {
      logger.error('Failed to load custom sites', error);
    }
  };

  const normalizeUrl = (url: string): string => {
    try {
      const parsedUrl = new URL(url);
      let hostname = parsedUrl.hostname.toLowerCase();
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }
      return hostname;
    } catch {
      return url.toLowerCase();
    }
  };

  const isSiteUrlExists = (url: string): boolean => {
    const normalizedNewUrl = normalizeUrl(url);
    return sites.some(site => normalizeUrl(site.url) === normalizedNewUrl);
  };

  const handleAddSite = async () => {
    if (!newSite.name.trim() || !newSite.url.trim()) {
      Alert.alert('Error', 'Please enter both name and URL');
      return;
    }

    // Validate URL
    let url = newSite.url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    try {
      new URL(url); // Validate URL format
    } catch {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    if (isSiteUrlExists(url)) {
      Alert.alert('Error', 'This website already exists in your quick access');
      return;
    }

    const customSite: Site = {
      name: newSite.name,
      url,
      icon: 'globe-outline',
      color: '#4285f4',
      isCustom: true,
    };

    try {
      const customSites = await StorageManager.getItem<Site[]>('custom_sites', []);
      const updatedCustomSites = [...customSites, customSite];
      await StorageManager.setItem('custom_sites', updatedCustomSites);

      setSites(prev => [...prev, customSite]);
      setNewSite({ name: '', url: '' });
      setShowAddModal(false);
      Alert.alert('Success', 'Site added to quick access');
    } catch (error) {
      Alert.alert('Error', 'Failed to save custom site');
    }
  };

  const handleRemoveSite = (site: Site) => {
    if (!site.isCustom) return;

    Alert.alert(
      'Remove Site',
      `Remove ${site.name} from quick access?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const customSites = await StorageManager.getItem<Site[]>('custom_sites', []);
              const filtered = customSites.filter(s => s.url !== site.url);
              await StorageManager.setItem('custom_sites', filtered);

              setSites(prev => prev.filter(s => s.url !== site.url));
            } catch (error) {
              Alert.alert('Error', 'Failed to remove site');
            }
          },
        },
      ]
    );
  };

  // Calculate item width based on percentage to ensure perfect grid
  const itemWidthPercent = `${100 / itemsPerRow}%`;
  
  // Enhanced responsive configuration for better iPad layout
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;

  return (
    <View style={[styles.container, isTablet && styles.containerTablet]}>
      {/* Add Site Button */}
      <TouchableOpacity style={[styles.addSiteButton, isTablet && styles.addSiteButtonTablet]} onPress={() => setShowAddModal(true)}>
        <View style={[styles.addSiteIcon, isTablet && styles.addSiteIconTablet]}>
          <Ionicons name="add" size={responsiveIconSize(isTablet ? 28 : 24)} color="#4285f4" />
        </View>
        <View style={styles.addSiteContent}>
          <Text style={[styles.addSiteTitle, isTablet && styles.addSiteTitleTablet]}>Add site</Text>
          <Text style={[styles.addSiteSubtitle, isTablet && styles.addSiteSubtitleTablet]}>Add your favorite websites to quick access</Text>
        </View>
      </TouchableOpacity>

      {/* Sites Grid */}
      <View style={[styles.sitesGrid, isTablet && styles.sitesGridTablet]}>
        {sites.map((site, index) => (
          <TouchableOpacity
            key={`${site.url}-${index}`}
            style={[
              styles.siteCard, 
              { width: itemWidthPercent as any },
              isTablet && styles.siteCardTablet
            ]}
            onPress={() => onSitePress(site.url)}
            onLongPress={() => handleRemoveSite(site)}
          >
            <View style={[
              styles.siteIcon, 
              { backgroundColor: `${site.color}20` },
              isTablet && styles.siteIconTablet
            ]}>
              {typeof site.icon === 'function' ? (
                <site.icon size={isTablet ? 28 : 24} color={site.color} />
              ) : (
                <Ionicons name={site.icon} size={isTablet ? 28 : 24} color={site.color} />
              )}
            </View>
            <Text style={[
              styles.siteName, 
              isTablet && styles.siteNameTablet
            ]} numberOfLines={1}>
              {site.name}
            </Text>
            {site.isCustom && (
              <View style={[styles.customBadge, isTablet && styles.customBadgeTablet]}>
                <Ionicons name="star" size={isTablet ? 12 : 10} color="#4CAF50" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Add Site Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Website</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <TextInput
                style={styles.modalInput}
                value={newSite.name}
                onChangeText={(text) => setNewSite(prev => ({ ...prev, name: text }))}
                placeholder="Site Name (e.g., Reddit)"
                placeholderTextColor="#888"
                autoCapitalize="words"
              />

              <TextInput
                style={styles.modalInput}
                value={newSite.url}
                onChangeText={(text) => setNewSite(prev => ({ ...prev, url: text }))}
                placeholder="URL (e.g., reddit.com)"
                placeholderTextColor="#888"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddSite}
              >
                <Text style={styles.addButtonText}>Add to Quick Access</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: responsiveSpacing(isSmallScreen() ? 12 : 16),
    paddingBottom: responsiveSpacing(100),
  },
  containerTablet: {
    paddingHorizontal: responsiveSpacing(24),
    paddingBottom: responsiveSpacing(120),
  },
  addSiteButton: {
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    borderRadius: responsiveBorderRadius(16),
    padding: responsiveSpacing(16),
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsiveSpacing(24),
    borderWidth: 0.5,
    borderColor: 'rgba(66, 133, 244, 0.15)',
  },
  addSiteButtonTablet: {
    padding: responsiveSpacing(20),
    borderRadius: responsiveBorderRadius(20),
    marginBottom: responsiveSpacing(32),
  },
  addSiteIcon: {
    width: responsiveWidth(40),
    height: responsiveWidth(40),
    borderRadius: responsiveBorderRadius(20),
    backgroundColor: 'rgba(66, 133, 244, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: responsiveSpacing(12),
  },
  addSiteIconTablet: {
    width: responsiveWidth(48),
    height: responsiveWidth(48),
    borderRadius: responsiveBorderRadius(24),
    marginRight: responsiveSpacing(16),
  },
  addSiteContent: {
    flex: 1,
  },
  addSiteTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: responsiveSpacing(4),
  },
  addSiteTitleTablet: {
    fontSize: responsiveFontSize(18),
    marginBottom: responsiveSpacing(6),
  },
  addSiteSubtitle: {
    fontSize: responsiveFontSize(13),
    color: '#aaa',
  },
  addSiteSubtitleTablet: {
    fontSize: responsiveFontSize(15),
  },
  sitesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Removed justifyContent: 'space-between' to prevent gap issues
    marginHorizontal: -responsiveSpacing(4), // Negative margin to offset item padding
  },
  sitesGridTablet: {
    marginHorizontal: -responsiveSpacing(6),
  },
  siteCard: {
    alignItems: 'center',
    marginBottom: responsiveSpacing(20),
    position: 'relative',
    paddingHorizontal: responsiveSpacing(4), // Padding creates spacing between items
  },
  siteCardTablet: {
    marginBottom: responsiveSpacing(28),
    paddingHorizontal: responsiveSpacing(6),
  },
  siteIcon: {
    width: responsiveWidth(isSmallScreen() ? 48 : 56),
    height: responsiveWidth(isSmallScreen() ? 48 : 56),
    borderRadius: responsiveBorderRadius(isSmallScreen() ? 24 : 28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: responsiveSpacing(8),
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  siteIconTablet: {
    width: responsiveWidth(64),
    height: responsiveWidth(64),
    borderRadius: responsiveBorderRadius(32),
    marginBottom: responsiveSpacing(12),
  },
  siteName: {
    fontSize: responsiveFontSize(isSmallScreen() ? 11 : 12),
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
    width: '100%',
  },
  siteNameTablet: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
  customBadge: {
    position: 'absolute',
    top: -2,
    right: responsiveSpacing(12),
    width: responsiveWidth(16),
    height: responsiveWidth(16),
    borderRadius: responsiveBorderRadius(8),
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  customBadgeTablet: {
    top: -3,
    right: responsiveSpacing(16),
    width: responsiveWidth(20),
    height: responsiveWidth(20),
    borderRadius: responsiveBorderRadius(10),
    borderWidth: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1a1b3a',
    borderRadius: responsiveBorderRadius(24),
    width: wp(90),
    maxWidth: 400,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: responsiveSpacing(20),
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalContent: {
    padding: responsiveSpacing(20),
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: responsiveBorderRadius(12),
    padding: responsiveSpacing(16),
    color: '#ffffff',
    fontSize: responsiveFontSize(16),
    marginBottom: responsiveSpacing(16),
  },
  addButton: {
    backgroundColor: '#4285f4',
    borderRadius: responsiveBorderRadius(12),
    padding: responsiveSpacing(16),
    alignItems: 'center',
    marginTop: responsiveSpacing(8),
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
});
