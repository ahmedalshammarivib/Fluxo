/**
 * AdBlocker Full Page
 * 
 * Advanced AdBlocker settings and statistics page
 * Features:
 * - Beautiful gradient header with glass stats card
 * - Main ad blocking toggle
 * - Whitelist management
 * - Info section explaining benefits
 * - Full dark mode support
 * - Smooth animations throughout
 * - Real-time statistics from WebView
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';

import { useBrowserStore } from '../../store/browserStore';
import { getThemeColors } from '../../theme/colors';
import { StatsCard } from '../../components/adBlocker/StatsCard';
import { WhitelistManager } from '../../components/adBlocker/WhitelistManager';
import { InfoSection } from '../../components/adBlocker/InfoSection';
import {
  responsiveSpacing,
  responsiveFontSize,
  responsiveHeight,
  responsiveBorderRadius,
  isSmallScreen,
} from '../../utils/responsive';
import { WhitelistValidationResult } from '../../types/adBlocker';

const isSmallScreenDevice = isSmallScreen();

/**
 * Main Toggle Card Component
 */
interface MainToggleCardProps {
  enabled: boolean;
  onToggle: () => void;
  nightMode: boolean;
}

const MainToggleCard: React.FC<MainToggleCardProps> = ({
  enabled,
  onToggle,
  nightMode,
}) => {
  const scale = useSharedValue(1);
  
  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1);
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  return (
    <Animated.View
      entering={FadeInDown.delay(100).springify()}
      style={[
        styles.mainToggleCard,
        nightMode && styles.mainToggleCardDark,
      ]}
    >
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={styles.mainToggleContent}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          onPress={onToggle}
        >
          <View style={styles.mainToggleLeft}>
            <LinearGradient
              colors={enabled ? ['#4CAF50', '#81C784'] : ['#9E9E9E', '#BDBDBD']}
              style={styles.mainToggleIconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name="shield-checkmark"
                size={28}
                color="#FFFFFF"
              />
            </LinearGradient>
            <View style={styles.mainToggleText}>
              <Text
                style={[
                  styles.mainToggleTitle,
                  nightMode && styles.mainToggleTitleDark,
                ]}
              >
                Ad Blocking
              </Text>
              <Text
                style={[
                  styles.mainToggleSubtitle,
                  nightMode && styles.mainToggleSubtitleDark,
                ]}
              >
                {enabled ? 'Protection is active' : 'Protection is disabled'}
              </Text>
            </View>
          </View>
          
          <Switch
            value={enabled}
            onValueChange={onToggle}
            trackColor={{ false: '#E0E0E0', true: '#81C784' }}
            thumbColor={enabled ? '#4CAF50' : '#FAFAFA'}
            ios_backgroundColor="#E0E0E0"
          />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

/**
 * Privacy Feature Toggle Component
 */
interface PrivacyFeatureToggleProps {
  icon: string;
  iconColor: string;
  iconBgColors: [string, string];
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  nightMode: boolean;
  delay?: number;
}

const PrivacyFeatureToggle: React.FC<PrivacyFeatureToggleProps> = ({
  icon,
  iconColor,
  iconBgColors,
  title,
  description,
  enabled,
  onToggle,
  nightMode,
  delay = 0,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      layout={Layout.springify()}
      style={[
        styles.featureToggle,
        nightMode && styles.featureToggleDark,
      ]}
    >
      <View style={styles.featureToggleLeft}>
        <LinearGradient
          colors={iconBgColors}
          style={styles.featureIconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={icon as any} size={22} color={iconColor} />
        </LinearGradient>
        <View style={styles.featureText}>
          <Text style={[styles.featureTitle, nightMode && styles.featureTitleDark]}>
            {title}
          </Text>
          <Text
            style={[styles.featureDescription, nightMode && styles.featureDescriptionDark]}
            numberOfLines={2}
          >
            {description}
          </Text>
        </View>
      </View>
      
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: '#E0E0E0', true: '#81C784' }}
        thumbColor={enabled ? '#4CAF50' : '#FAFAFA'}
        ios_backgroundColor="#E0E0E0"
      />
    </Animated.View>
  );
};

/**
 * Main AdBlocker Page Component
 */
export default function AdBlockerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // Store selectors
  const {
    nightMode,
    incognitoMode,
    adBlocker,
    toggleAdBlock,
    toggleTrackingProtection,
    toggleLocationPrivacy,
    addToWhitelist,
    removeFromWhitelist,
    loadAdBlockerData,
  } = useBrowserStore();

  const themeColors = getThemeColors(nightMode, incognitoMode);
  
  // Load data on mount
  useEffect(() => {
    loadAdBlockerData();
  }, []);
  
  // Calculate total blocked (lifetime)
  const totalBlocked = 
    adBlocker.stats.lifetime.totalAdsBlocked + 
    adBlocker.stats.lifetime.totalTrackersBlocked;
  
  // Handle whitelist add
  const handleAddToWhitelist = useCallback(async (domain: string): Promise<WhitelistValidationResult> => {
    return await addToWhitelist(domain);
  }, [addToWhitelist]);
  
  // Handle whitelist remove
  const handleRemoveFromWhitelist = useCallback(async (id: string): Promise<void> => {
    await removeFromWhitelist(id);
  }, [removeFromWhitelist]);
  
  return (
    <View style={[styles.container, nightMode && styles.containerDark]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      
      {/* Gradient Header Background */}
      <LinearGradient
        colors={nightMode 
          ? ['#0F172A', '#1E293B', '#334155'] 
          : ['#10B981', '#06B6D4', '#3B82F6']
        }
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header with back button */}
        <View style={{ paddingTop: insets.top }}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Ad Blocker</Text>
              <View style={styles.headerTitleUnderline} />
            </View>
            
            <View style={styles.headerRightPlaceholder} />
          </View>
          
          {/* Stats Card in Header */}
          <View style={styles.statsCardContainer}>
            <StatsCard
              totalBlocked={totalBlocked}
              lastUpdated={adBlocker.stats.lifetime.lastUpdated}
              animate={true}
            />
          </View>
        </View>
      </LinearGradient>
      
      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Main Toggle Card */}
        <MainToggleCard
          enabled={adBlocker.features.adBlocking}
          onToggle={toggleAdBlock}
          nightMode={nightMode}
        />
        
        {/* Privacy Features Section */}
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={[styles.sectionContainer, nightMode && styles.sectionContainerDark]}
        >
          <Text style={[styles.sectionTitle, nightMode && styles.sectionTitleDark]}>
            Privacy Features
          </Text>
          
          <View style={styles.featuresList}>
            <PrivacyFeatureToggle
              icon="analytics-outline"
              iconColor="#1976D2"
              iconBgColors={['#E3F2FD', '#BBDEFB']}
              title="Tracking Protection"
              description="Block tracking scripts and analytics"
              enabled={adBlocker.features.trackingProtection}
              onToggle={toggleTrackingProtection}
              nightMode={nightMode}
              delay={200}
            />
            
            <PrivacyFeatureToggle
              icon="location-outline"
              iconColor="#7B1FA2"
              iconBgColors={['#F3E5F5', '#E1BEEF']}
              title="Location Privacy"
              description="Spoof your location to protect privacy"
              enabled={adBlocker.features.locationPrivacy}
              onToggle={toggleLocationPrivacy}
              nightMode={nightMode}
              delay={250}
            />
          </View>
        </Animated.View>
        
        {/* Whitelist Section */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <WhitelistManager
            items={adBlocker.whitelist}
            onAdd={handleAddToWhitelist}
            onRemove={handleRemoveFromWhitelist}
          />
        </Animated.View>
        
        {/* Info Section */}
        <Animated.View entering={FadeInDown.delay(350).springify()}>
          <InfoSection nightMode={nightMode} />
        </Animated.View>
        
        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  headerGradient: {
    paddingBottom: responsiveSpacing(16),
    borderBottomLeftRadius: responsiveBorderRadius(32),
    borderBottomRightRadius: responsiveBorderRadius(32),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: responsiveSpacing(16),
    paddingTop: responsiveSpacing(8),
    paddingBottom: responsiveSpacing(16),
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: responsiveFontSize(22),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitleUnderline: {
    width: 20,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 1.5,
    marginTop: 2,
  },
  headerRightPlaceholder: {
    width: 44,
  },
  statsCardContainer: {
    alignItems: 'center',
    paddingBottom: responsiveSpacing(5),
  },
  scrollView: {
    flex: 1,
    marginTop: -responsiveSpacing(25),
  },
  scrollContent: {
    paddingTop: responsiveSpacing(4),
    paddingHorizontal: responsiveSpacing(16),
    paddingBottom: responsiveSpacing(24),
  },
  mainToggleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: responsiveBorderRadius(24),
    marginBottom: responsiveSpacing(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  mainToggleCardDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mainToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: responsiveSpacing(20),
  },
  mainToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mainToggleIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: responsiveSpacing(16),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  mainToggleIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: responsiveSpacing(16),
  },
  mainToggleText: {
    flex: 1,
  },
  mainToggleTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: responsiveSpacing(4),
    letterSpacing: -0.3,
  },
  mainToggleTitleDark: {
    color: '#F8FAFC',
  },
  mainToggleSubtitle: {
    fontSize: responsiveFontSize(13),
    color: '#64748B',
    fontWeight: '500',
  },
  mainToggleSubtitleDark: {
    color: '#94A3B8',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: responsiveBorderRadius(24),
    marginBottom: responsiveSpacing(16),
    padding: responsiveSpacing(20),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  sectionContainerDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: responsiveSpacing(16),
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  sectionTitleDark: {
    color: '#F8FAFC',
  },
  featuresList: {
    gap: responsiveSpacing(16),
  },
  featureToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: responsiveBorderRadius(24),
    padding: responsiveSpacing(16),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  featureToggleDark: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  featureToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: responsiveSpacing(12),
  },
  featureIconGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: responsiveSpacing(16),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: responsiveSpacing(16),
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: responsiveSpacing(4),
    letterSpacing: -0.3,
  },
  featureTitleDark: {
    color: '#F1F5F9',
  },
  featureDescription: {
    fontSize: responsiveFontSize(12),
    color: '#64748B',
    lineHeight: responsiveFontSize(16),
    fontWeight: '500',
  },
  featureDescriptionDark: {
    color: '#94A3B8',
  },
  bottomPadding: {
    height: responsiveSpacing(16),
  },
});
