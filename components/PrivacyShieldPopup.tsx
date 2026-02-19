/**
 * Privacy Shield Popup Component - REDESIGNED
 * 
 * Bottom sheet modal showing privacy protection status
 * Matches exact design with:
 * - Large circular shield icon with gradient
 * - Stats in rounded cards side by side
 * - Colored toggle backgrounds (pink, blue, purple)
 * - Large CTA button at bottom
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  BackHandler,
  Platform,
  Switch,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import { useBrowserStore } from '../store/browserStore';
import { PrivacyShieldPopupProps } from '../types/adBlocker';
import {
  responsiveSpacing,
  responsiveFontSize,
  responsiveHeight,
  responsiveWidth,
  responsiveBorderRadius,
  isSmallScreen,
  isLargeScreen,
  isMediumScreen,
  isTablet as checkIsTablet,
} from '../utils/responsive';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const { height: FULL_SCREEN_HEIGHT } = Dimensions.get('screen');

/**
 * Senior Dev Note: Adaptive Height & Width System
 * - On Tablets: Max 600px width, centered, 75% max height.
 * - On Phones: Full width, 85% max height.
 */
const IS_TABLET = checkIsTablet();
const POPUP_MAX_HEIGHT = IS_TABLET ? SCREEN_HEIGHT * 0.75 : SCREEN_HEIGHT * 0.85;
const POPUP_WIDTH = IS_TABLET ? 600 : SCREEN_WIDTH;
const DISMISS_THRESHOLD = POPUP_MAX_HEIGHT * 0.25;

/**
 * Stats Card Component - White card with subtle shadow
 */
interface StatsCardProps {
  value: number;
  label: string;
  valueColor: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ value, label, valueColor }) => (
  <View style={styles.statsCard}>
    <Text style={[styles.statsValue, { color: valueColor }]}>{value}</Text>
    <Text style={styles.statsLabel}>{label}</Text>
  </View>
);

/**
 * Privacy Toggle Card - Modern row layout
 */
interface ToggleCardProps {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  iconBgColor: string;
  iconColor: string;
}

const ToggleCard: React.FC<ToggleCardProps> = ({
  icon,
  title,
  description,
  enabled,
  onToggle,
  iconBgColor,
  iconColor,
}) => (
  <View style={styles.toggleRow}>
    <View style={[styles.toggleIconBox, { backgroundColor: iconBgColor }]}>
      <Ionicons name={icon as any} size={20} color={iconColor} />
    </View>
    <View style={styles.toggleTextContainer}>
      <Text style={styles.toggleTitle}>{title}</Text>
      <Text style={styles.toggleDescription}>{description}</Text>
    </View>
    <Switch
      value={enabled}
      onValueChange={onToggle}
      trackColor={{ false: '#E0E0E0', true: '#00D0B1' }}
      thumbColor="#FFFFFF"
      ios_backgroundColor="#E0E0E0"
    />
  </View>
);

/**
 * Main Privacy Shield Popup Component
 */
export const PrivacyShieldPopup: React.FC<PrivacyShieldPopupProps> = ({
  visible,
  onClose,
  currentUrl,
  onViewReport,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(POPUP_MAX_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  
  // Store selectors
  const {
    adBlocker,
    toggleAdBlock,
    toggleTrackingProtection,
    toggleLocationPrivacy,
    isWhitelisted,
  } = useBrowserStore();
  
  // Check if current site is whitelisted
  const siteWhitelisted = currentUrl ? isWhitelisted(currentUrl) : false;
  
  // Animation on visibility change
  useEffect(() => {
    if (visible) {
      // Senior Dev Fix: Always reset to bottom before starting entry animation
      translateY.value = POPUP_MAX_HEIGHT + 100; 
      translateY.value = withTiming(0, {
        duration: 350,
      });
      backdropOpacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(POPUP_MAX_HEIGHT + 100, { duration: 250 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);
  
  // Handle back button (Android)
  useEffect(() => {
    if (!visible) return;
    
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    
    return () => backHandler.remove();
  }, [visible, onClose]);
  
  // Close handler
  const handleClose = useCallback(() => {
    translateY.value = withTiming(POPUP_MAX_HEIGHT, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
    backdropOpacity.value = withTiming(0, { duration: 200 });
  }, [onClose]);
  
  // View report handler
  const handleViewReport = useCallback(() => {
    handleClose();
    if (onViewReport) {
      onViewReport();
    } else {
      setTimeout(() => {
        router.push('/(tabs)/adBlocker');
      }, 300);
    }
  }, [handleClose, onViewReport, router]);
  
  // Pan gesture for swipe to dismiss
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD) {
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0, {
          damping: 20,
          stiffness: 200,
        });
      }
    });
  
  // Animated styles
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  
  // Stats data
  const currentPageAds = adBlocker.stats.currentPage.adsBlocked;
  const currentPageTrackers = adBlocker.stats.currentPage.trackersBlocked;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {visible && (
        <GestureHandlerRootView style={styles.gestureRoot}>
          {/* Backdrop */}
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            <TouchableOpacity
              style={styles.backdropTouchable}
              activeOpacity={1}
              onPress={handleClose}
            />
          </Animated.View>
          
          {/* Sheet */}
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.sheet, sheetStyle]}>
              {/* Safety net at the very bottom to prevent see-through */}
              <View style={styles.bottomSafetyNet} />
              
              {/* Handle Bar stays outside ScrollView for consistent gesture feel */}
              <View style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>
              
              <ScrollView 
                showsVerticalScrollIndicator={false}
                bounces={false}
                keyboardShouldPersistTaps="handled"
                scrollEventThrottle={16}
                contentContainerStyle={[
                  styles.scrollContent,
                  { 
                    paddingBottom: Math.max(insets.bottom, responsiveSpacing(24)) + responsiveSpacing(20) 
                  }
                ]}
              >
                {/* Large Shield Icon with Gradient Background */}
                <View style={styles.shieldContainer}>
                  <LinearGradient
                    colors={['#E0F7F4', '#B2EBF2']}
                    style={styles.shieldGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="shield" size={40} color="#00D0B1" />
                  </LinearGradient>
                </View>
                
                {/* Title */}
                <Text style={styles.title}>Privacy Shield Active</Text>
                
                {/* Subtitle */}
                <Text style={styles.subtitle}>
                  Your session is secured and tracking is minimized.
                </Text>
                
                {/* Stats Row - Two Cards Side by Side */}
                <View style={styles.statsRow}>
                  <StatsCard
                    value={currentPageTrackers}
                    label="TRACKERS"
                    valueColor="#121A26"
                  />
                  <StatsCard
                    value={currentPageAds}
                    label="ADS BLOCKED"
                    valueColor="#00D0B1"
                  />
                </View>
                
                {/* Toggle Cards with Colored Backgrounds */}
                <View style={styles.togglesContainer}>
                  {/* Ad Blocking - Pink */}
                  <ToggleCard
                    icon="ban"
                    title="Ad Blocking"
                    description="Block intrusive ads on this site"
                    enabled={adBlocker.features.adBlocking && !siteWhitelisted}
                    onToggle={toggleAdBlock}
                    iconBgColor="#FFEBEB"
                    iconColor="#FF5252"
                  />
                  
                  {/* Tracking Protection - Blue */}
                  <ToggleCard
                    icon="eye-off"
                    title="Tracking Protection"
                    description="Prevent cross-site tracking"
                    enabled={adBlocker.features.trackingProtection}
                    onToggle={toggleTrackingProtection}
                    iconBgColor="#EBF2FF"
                    iconColor="#448AFF"
                  />
                  
                  {/* Location Privacy - Purple */}
                  <ToggleCard
                    icon="location"
                    title="Location Privacy"
                    description="Mask your real location"
                    enabled={adBlocker.features.locationPrivacy}
                    onToggle={toggleLocationPrivacy}
                    iconBgColor="#F5EBFF"
                    iconColor="#AB47BC"
                  />
                </View>

                {/* Large CTA Button */}
                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={handleViewReport}
                  activeOpacity={0.8}
                >
                  <Text style={styles.ctaButtonText}>View Detailed Report</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Senior Dev Note: Extra Spacer for Safe Area Padding on Android & iOS */}
                <View style={{ height: Platform.OS === 'ios' ? 0 : responsiveSpacing(16) }} />
              </ScrollView>
            </Animated.View>
          </GestureDetector>
        </GestureHandlerRootView>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FULL_SCREEN_HEIGHT + 100, // Extend backdrop further down to be safe
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: -30, // "Buried Bottom" technique - hide any gaps
    alignSelf: 'center',
    width: POPUP_WIDTH,
    maxHeight: POPUP_MAX_HEIGHT + 50, // Compensate for the buried depth
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: responsiveBorderRadius(32),
    borderTopRightRadius: responsiveBorderRadius(32),
    overflow: 'hidden', 
    paddingBottom: 50, // Compensate for buried bottom
    marginBottom: 20, // Slight lift for better positioning
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 25, 
      },
    }),
  },
  // Safety net for the very bottom of the screen (Android Nav Bar area)
  bottomSafetyNet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100, // Large enough to cover any nav bar
    backgroundColor: '#F8F9FA',
    zIndex: -1, // Behind the sheet content
  },
  scrollContent: {
    paddingHorizontal: responsiveSpacing(24),
    paddingTop: responsiveSpacing(8),
    // Extra bottom padding to ensure safe area coverage and visibility of CTA button
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: responsiveSpacing(16),
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  
  // Shield Icon
  shieldContainer: {
    alignItems: 'center',
    marginTop: responsiveSpacing(8),
    marginBottom: responsiveSpacing(16),
  },
  shieldGradient: {
    width: responsiveWidth(72),
    height: responsiveWidth(72),
    borderRadius: responsiveWidth(36),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#00D0B1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  
  // Title & Subtitle
  title: {
    fontSize: responsiveFontSize(22),
    fontWeight: '800',
    color: '#121A26',
    textAlign: 'center',
    marginBottom: responsiveSpacing(8),
  },
  subtitle: {
    fontSize: responsiveFontSize(14),
    color: '#7D848D',
    textAlign: 'center',
    lineHeight: responsiveFontSize(20),
    paddingHorizontal: responsiveSpacing(20),
    marginBottom: responsiveSpacing(24),
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: responsiveSpacing(24),
    gap: responsiveSpacing(16),
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: responsiveBorderRadius(20),
    paddingVertical: responsiveSpacing(20),
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statsValue: {
    fontSize: responsiveFontSize(32),
    fontWeight: '800',
    marginBottom: responsiveSpacing(4),
  },
  statsLabel: {
    fontSize: responsiveFontSize(11),
    fontWeight: '600',
    color: '#7D848D',
    letterSpacing: 0.5,
  },
  
  // Toggle Rows
  togglesContainer: {
    gap: responsiveSpacing(12),
    marginBottom: responsiveSpacing(32),
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: responsiveBorderRadius(20),
    padding: responsiveSpacing(12),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  toggleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: responsiveSpacing(12),
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: responsiveFontSize(15),
    fontWeight: '700',
    color: '#121A26',
    marginBottom: responsiveSpacing(2),
  },
  toggleDescription: {
    fontSize: responsiveFontSize(12),
    color: '#7D848D',
  },
  
  // CTA Button
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121A26',
    borderRadius: responsiveBorderRadius(16),
    paddingVertical: responsiveSpacing(18),
    gap: responsiveSpacing(10),
    marginBottom: responsiveSpacing(10),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  ctaButtonText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default PrivacyShieldPopup;
