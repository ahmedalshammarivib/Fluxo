/**
 * TabCard Component
 * Grid-optimized tab card for 2-column layout
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SimpleTab } from '@/types/simpleTabs';
import { TabsPageTheme } from './tabsTheme';
import {
  responsiveSpacing,
  responsiveFontSize,
  responsiveIconSize,
  responsiveBorderRadius,
} from '@/utils/responsive';

interface TabCardProps {
  tab: SimpleTab;
  isActive: boolean;
  onPress: () => void;
  onClose: () => void;
  theme: TabsPageTheme;
  cardWidth: number;
}

// Get favicon/icon based on URL
const getTabIcon = (url: string): string => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('google.com')) return 'logo-google';
  if (lowerUrl.includes('youtube.com')) return 'logo-youtube';
  if (lowerUrl.includes('facebook.com')) return 'logo-facebook';
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'logo-twitter';
  if (lowerUrl.includes('instagram.com')) return 'logo-instagram';
  if (lowerUrl.includes('github.com')) return 'logo-github';
  if (lowerUrl.includes('reddit.com')) return 'logo-reddit';
  if (lowerUrl.includes('linkedin.com')) return 'logo-linkedin';
  if (lowerUrl.includes('whatsapp.com')) return 'logo-whatsapp';
  return 'globe-outline';
};

// Get icon color based on site
const getIconColor = (url: string, defaultColor: string): string => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('google.com')) return '#4285f4';
  if (lowerUrl.includes('youtube.com')) return '#ff0000';
  if (lowerUrl.includes('facebook.com')) return '#1877f2';
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return '#1da1f2';
  if (lowerUrl.includes('instagram.com')) return '#e4405f';
  if (lowerUrl.includes('github.com')) return '#24292e';
  if (lowerUrl.includes('reddit.com')) return '#ff4500';
  if (lowerUrl.includes('whatsapp.com')) return '#25d366';
  return defaultColor;
};

export const TabCard: React.FC<TabCardProps> = ({
  tab,
  isActive,
  onPress,
  onClose,
  theme,
  cardWidth,
}) => {
  const iconName = getTabIcon(tab.url);
  const iconColor = getIconColor(tab.url, theme.accentColor);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          width: cardWidth,
          backgroundColor: theme.cardBackground,
          borderColor: isActive ? theme.activeCardBorder : theme.cardBorder,
          borderWidth: isActive ? 2.5 : 1.5,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Preview Area with Website Screenshot or Icon */}
      <View style={[styles.previewArea, { backgroundColor: '#ffffff' }]}>
        {tab.screenshot ? (
          <Image
            source={{ uri: tab.screenshot }}
            style={styles.screenshotImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons 
            name={iconName as any} 
            size={responsiveIconSize(48)} 
            color={iconColor} 
          />
        )}
      </View>

      {/* Bottom Info Bar */}
      <View style={[
        styles.infoBar,
        { 
          backgroundColor: isActive ? theme.activeCardBorder : 'rgba(0, 0, 0, 0.05)',
        }
      ]}>
        {/* Tab Title */}
        <View style={styles.titleContainer}>
          <Ionicons 
            name={iconName as any} 
            size={responsiveIconSize(16)} 
            color={isActive ? '#ffffff' : iconColor} 
          />
          <Text 
            style={[
              styles.title, 
              { color: isActive ? '#ffffff' : theme.textPrimary }
            ]} 
            numberOfLines={1}
          >
            {tab.title}
          </Text>
        </View>

        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onClose();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons 
            name="close" 
            size={responsiveIconSize(18)} 
            color={isActive ? '#ffffff' : 'rgba(0, 0, 0, 0.5)'} 
          />
        </TouchableOpacity>
      </View>

      {/* Active Indicator Badge */}
      {isActive && (
        <View style={[styles.activeBadge, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: responsiveBorderRadius(16),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  previewArea: {
    aspectRatio: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: responsiveSpacing(10),
    paddingVertical: responsiveSpacing(8),
    minHeight: 44,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSpacing(6),
    marginRight: responsiveSpacing(8),
  },
  title: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  activeBadge: {
    position: 'absolute',
    top: responsiveSpacing(8),
    left: responsiveSpacing(8),
    paddingHorizontal: responsiveSpacing(8),
    paddingVertical: responsiveSpacing(3),
    borderRadius: responsiveBorderRadius(8),
  },
  activeBadgeText: {
    color: '#ffffff',
    fontSize: responsiveFontSize(9),
    fontWeight: 'bold',
  },
});

export default TabCard;
