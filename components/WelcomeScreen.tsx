import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';
import { responsiveFontSize, responsiveSpacing, wp } from '@/utils/responsive';

const WelcomeScreen: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations sequence
    Animated.sequence([
      // 1. Logo Fade and Scale
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // 2. Text Fade and Slide
      Animated.parallel([
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(textSlideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
      ]),
    ]).start();

    // Continuous breathing animation for the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, scaleAnim, textFadeAnim, textSlideAnim, pulseAnim]);

  return (
    <LinearGradient
      colors={colors.gradients.background}
      style={styles.container}
    >
      <View style={styles.content}>
        <Animated.View style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { scale: pulseAnim }
            ]
          }
        ]}>
          <View style={styles.glowEffect} />
          <Image
            source={require('../App icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={[
          styles.textContainer,
          {
            opacity: textFadeAnim,
            transform: [{ translateY: textSlideAnim }]
          }
        ]}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.brandText}>Fluxo</Text>
          <View style={styles.underline} />
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: wp(45),
    height: wp(45),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: responsiveSpacing(30),
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  glowEffect: {
    position: 'absolute',
    width: wp(55),
    height: wp(55),
    borderRadius: wp(27.5),
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    shadowColor: '#4285f4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 5,
  },
  textContainer: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: responsiveFontSize(18),
    color: colors.text.secondary,
    letterSpacing: 1.5,
    marginBottom: responsiveSpacing(4),
    fontWeight: '300',
    textTransform: 'uppercase',
  },
  brandText: {
    fontSize: responsiveFontSize(42),
    color: colors.text.primary,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  underline: {
    width: 50,
    height: 3,
    backgroundColor: colors.primary,
    marginTop: responsiveSpacing(15),
    borderRadius: 2,
  },
});

export default WelcomeScreen;
