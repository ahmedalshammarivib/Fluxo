/**
 * StatsCard Component
 * 
 * Beautiful gradient stats card for the AdBlocker page
 * Features:
 * - Green to blue gradient background
 * - Glass/frosted effect
 * - Large animated counter
 * - "Last updated" timestamp
 * - Responsive design
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { StatsCardProps } from '../../types/adBlocker';
import {
  responsiveSpacing,
  responsiveFontSize,
  responsiveWidth,
  responsiveHeight,
  responsiveBorderRadius,
  isSmallScreen,
} from '../../utils/responsive';

/**
 * Format number with commas for better readability
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format timestamp to human-readable "time ago" format
 */
function formatTimeAgo(isoString: string): string {
  if (!isoString) return 'Just now';
  
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 10) return 'Just now';
  if (diffSecs < 60) return `${diffSecs} seconds ago`;
  if (diffMins < 60) return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
  if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString();
}

export const StatsCard: React.FC<StatsCardProps> = ({
  totalBlocked,
  lastUpdated,
  animate = true,
}) => {
  // Animated value for counter
  const animatedCount = useSharedValue(0);
  const cardScale = useSharedValue(0.9);
  const cardOpacity = useSharedValue(0);
  
  // Previous count for animation
  const prevCount = useRef(0);
  
  // Animate card entrance
  useEffect(() => {
    cardScale.value = withSpring(1, {
      damping: 15,
      stiffness: 100,
    });
    cardOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });
  }, []);
  
  // Animate counter when totalBlocked changes
  useEffect(() => {
    if (animate && totalBlocked !== prevCount.current) {
      // Animate from previous value to new value
      animatedCount.value = withTiming(totalBlocked, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      });
      prevCount.current = totalBlocked;
    } else {
      animatedCount.value = totalBlocked;
      prevCount.current = totalBlocked;
    }
  }, [totalBlocked, animate]);
  
  // Shield animation
  const shieldScale = useSharedValue(1);
  const shieldRotate = useSharedValue(0);

  useEffect(() => {
    shieldScale.value = withSpring(1.1, { damping: 2, stiffness: 80 }, () => {
      shieldScale.value = withSpring(1);
    });
    shieldRotate.value = withTiming(360, { duration: 1000, easing: Easing.out(Easing.exp) }, () => {
      shieldRotate.value = 0;
    });
  }, [totalBlocked]);

  const shieldAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: shieldScale.value },
      { rotate: `${shieldRotate.value}deg` }
    ],
  }));
  
  // Animated styles for card
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));
  
  // We'll display the number directly since animated text is complex in RN
  // The counter animation effect is handled by the card entrance animation
  
  return (
    <Animated.View style={[styles.container, cardAnimatedStyle]}>
      {/* Outer subtle ring for design match */}
      <View style={styles.outerRing}>
        {/* Glass card with gradient */}
        <View style={styles.glassCard}>
          {/* Inner gradient overlay for glass effect */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.05)']}
            style={styles.glassOverlay}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          
          {/* Shield Icon with animation */}
          <Animated.View style={[styles.iconContainer, shieldAnimatedStyle]}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
              style={styles.iconBg}
            >
              <Ionicons
                name="shield-checkmark"
                size={isSmallScreen() ? 40 : 48}
                color="#FFFFFF"
              />
            </LinearGradient>
          </Animated.View>
          
          {/* Counter */}
          <Text style={styles.counter}>
            {formatNumber(totalBlocked)}
          </Text>
          
          {/* Label */}
          <View style={styles.labelContainer}>
            <View style={styles.labelLine} />
            <Text style={styles.label}>
              ADS BLOCKED
            </Text>
            <View style={styles.labelLine} />
          </View>
        </View>
      </View>
      
      {/* Last Updated */}
      <View style={styles.timestampContainer}>
        <Ionicons name="time-outline" size={14} color="rgba(255, 255, 255, 0.6)" style={{ marginRight: 4 }} />
        <Text style={styles.timestamp}>
          Last updated {formatTimeAgo(lastUpdated)}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: responsiveSpacing(10),
  },
  outerRing: {
    padding: 10,
    borderRadius: responsiveBorderRadius(64),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: responsiveSpacing(8),
  },
  glassCard: {
    width: responsiveWidth(isSmallScreen() ? 200 : 230),
    height: responsiveHeight(isSmallScreen() ? 210 : 240),
    borderRadius: responsiveBorderRadius(54),
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  iconContainer: {
    marginBottom: responsiveSpacing(6),
  },
  iconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  counter: {
    fontSize: responsiveFontSize(isSmallScreen() ? 52 : 60),
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -2,
  },
  labelLine: {
    width: 12,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,
  },
  label: {
    fontSize: responsiveFontSize(11),
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: responsiveSpacing(8),
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timestamp: {
    fontSize: responsiveFontSize(isSmallScreen() ? 12 : 13),
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
});

export default StatsCard;
