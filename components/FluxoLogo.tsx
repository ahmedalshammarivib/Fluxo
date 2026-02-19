import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  responsiveSpacing,
  responsiveFontSize,
  isSmallScreen,
} from '@/utils/responsive';

interface FluxoLogoProps {
  incognitoMode?: boolean;
  nightMode?: boolean;
}

export const FluxoLogo: React.FC<FluxoLogoProps> = ({ incognitoMode, nightMode }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Entrance animation sequence
    Animated.sequence([
      // 1. Fade in and Scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)), // Overshoot slightly
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 2. Continuous subtle floating/breathing animation for the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const iconRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '10deg'], // Subtle rocking motion
  });

  const getBaseColor = () => {
    if (incognitoMode) return '#ff6b6b';
    if (nightMode) return '#f5a623';
    return '#ffffff';
  };

  const color = getBaseColor();

  return (
    <Animated.View style={[styles.container, { 
      opacity: fadeAnim, 
      transform: [{ scale: scaleAnim }],
      paddingVertical: responsiveSpacing(isSmallScreen() ? 8 : 10),
    }]}>
      {/* Animated Icon */}
      <Animated.View style={{ transform: [{ rotate: iconRotate }], marginRight: responsiveSpacing(8) }}>
        <Ionicons name="infinite" size={responsiveFontSize(isSmallScreen() ? 28 : 32)} color={color} />
      </Animated.View>
      
      {/* Text Logo */}
      <View>
        <Text style={[styles.text, { 
          color,
          fontSize: responsiveFontSize(isSmallScreen() ? 22 : 26),
          letterSpacing: 1.5,
        }]}>Fluxo</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '800',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
