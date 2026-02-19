import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Platform,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';

interface AnimatedAdBlockIconProps {
  isEnabled: boolean;
  blockedCount?: number;
  onToggle: () => void;
  size?: number;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const AnimatedAdBlockIcon: React.FC<AnimatedAdBlockIconProps> = ({
  isEnabled,
  blockedCount = 0,
  onToggle,
  size = 24,
}) => {
  // Animation values
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const colorProgress = useSharedValue(isEnabled ? 1 : 0);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  // Update color when enabled state changes
  useEffect(() => {
    colorProgress.value = withTiming(isEnabled ? 1 : 0, {
      duration: 300,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });

    if (isEnabled) {
      // Start pulse animation when enabled
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      // Start glow animation
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 800 }),
          withTiming(0.3, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      // Stop animations when disabled
      scale.value = withTiming(1, { duration: 200 });
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isEnabled]);

  // Handle tap with ripple effect and haptic feedback
  const handlePress = () => {
    // Haptic feedback
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      Vibration.vibrate(50);
    }

    // Ripple effect
    rippleScale.value = 0;
    rippleOpacity.value = 0.4;
    rippleScale.value = withTiming(2.5, { duration: 400 });
    rippleOpacity.value = withTiming(0, { duration: 400 });

    // Scale bounce on tap
    scale.value = withSequence(
      withSpring(0.85, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );

    onToggle();
  };

  // Animated styles for the icon container
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  // Animated styles for the glow effect
  const glowAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      ['transparent', 'rgba(0, 200, 83, 0.3)']
    );

    return {
      opacity: glowOpacity.value,
      backgroundColor,
    };
  });

  // Animated styles for the icon color
  const iconColorAnimatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      colorProgress.value,
      [0, 1],
      ['#757575', '#00C853']
    );

    return {
      color,
    };
  });

  // Animated styles for ripple effect
  const rippleAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: rippleScale.value }],
      opacity: rippleOpacity.value,
    };
  });

  // Animated styles for badge
  const badgeAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: colorProgress.value,
      transform: [
        { scale: withSpring(blockedCount > 0 ? 1 : 0, { damping: 15 }) }
      ],
    };
  });

  return (
    <View style={styles.wrapper}>
      {/* Glow effect behind icon */}
      <Animated.View style={[styles.glowEffect, glowAnimatedStyle]} />

      {/* Ripple effect */}
      <Animated.View style={[styles.ripple, rippleAnimatedStyle]} />

      {/* Main icon button */}
      <AnimatedTouchable
        onPress={handlePress}
        style={[styles.container, containerAnimatedStyle]}
        activeOpacity={0.8}
      >
        <Animated.Text style={iconColorAnimatedStyle}>
          <Ionicons 
            name={isEnabled ? "shield-checkmark" : "shield-outline"}
            size={size} 
          />
        </Animated.Text>
      </AnimatedTouchable>

      {/* Blocked count badge */}
      {blockedCount > 0 && (
        <Animated.View style={[styles.badge, badgeAnimatedStyle]}>
          <Text style={styles.badgeText}>
            {blockedCount > 99 ? '99+' : blockedCount}
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    // Shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: '#00C853',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  glowEffect: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  ripple: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 200, 83, 0.3)',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF5252',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#1a1b3a',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default AnimatedAdBlockIcon;
