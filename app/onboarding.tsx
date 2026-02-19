import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Platform, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import NotificationManager from '@/utils/notificationManager';
import FirstLaunchManager from '@/utils/firstLaunchManager';
import { colors } from '@/theme/colors';
import { responsiveFontSize, responsiveSpacing, wp } from '@/utils/responsive';

const FEATURES = [
  {
    icon: 'shield-checkmark-outline',
    title: 'Protect your privacy',
    subtitle: 'Fluxo blocks all creepy trackers',
    color: '#4CAF50',
  },
  {
    icon: 'duplicate-outline',
    title: 'Dual-Mode Browsing',
    subtitle: 'Switch between personal and private tabs',
    color: '#4285f4',
  },
  {
    icon: 'moon-outline',
    title: 'Gentle on your eyes',
    subtitle: 'Full black theme for comfortable reading',
    color: '#f5a623',
  },
  {
    icon: 'flash-outline',
    title: 'Navigate faster',
    subtitle: 'Quick access to your favorites and widgets',
    color: '#ff6b6b',
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [isRequesting, setIsRequesting] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const featureAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const buttonPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered feature animations
    const animations = featureAnims.map((anim, index) => 
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: 400 + (index * 150),
        useNativeDriver: true,
      })
    );
    Animated.stagger(150, animations).start();

    // Subtle button pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulseAnim, {
          toValue: 1.02,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(buttonPulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleAction = async () => {
    setIsRequesting(true);
    try {
      // Request notifications - the system dialog handles Allow/Deny
      await NotificationManager.requestPermissions();
      // Proceed regardless of choice
      await handleGetStarted();
    } catch (error) {
      console.error('Failed to request permissions', error);
      await handleGetStarted();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleGetStarted = async () => {
    await FirstLaunchManager.setOnboardingCompleted();
    router.replace('/(tabs)');
  };

  return (
    <LinearGradient
      colors={colors.gradients.background}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.content}>
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.title}>Meet your new</Text>
            <Text style={styles.titleBold}>favorite browser</Text>
          </Animated.View>

          <View style={styles.featuresContainer}>
            {FEATURES.map((feature, index) => (
              <Animated.View 
                key={index} 
                style={[
                  styles.featureItem, 
                  { 
                    opacity: featureAnims[index],
                    transform: [{ translateX: featureAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0]
                    })}]
                  }
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: `${feature.color}20` }]}>
                  <Ionicons name={feature.icon as any} size={24} color={feature.color} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          <Animated.View style={[styles.notificationCard, { opacity: fadeAnim }]}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.notifHeader}>
              <View style={styles.notifIconContainer}>
                <Ionicons name="notifications" size={22} color={colors.primary} />
                <View style={styles.notifIconGlow} />
              </View>
              <Text style={styles.notifPrompt}>
                Enable notifications to get updates and alerts
              </Text>
            </View>
          </Animated.View>

          <View style={styles.footer}>
            <Animated.View style={{ transform: [{ scale: buttonPulseAnim }] }}>
              <TouchableOpacity 
                style={[styles.primaryButton, isRequesting && styles.disabledButton]} 
                onPress={handleAction}
                disabled={isRequesting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={colors.gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>
                      {isRequesting ? 'Starting...' : 'Get Started'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: responsiveSpacing(24),
    paddingVertical: responsiveSpacing(20),
    justifyContent: 'space-between',
  },
  header: {
    marginTop: responsiveSpacing(20),
    alignItems: 'center',
  },
  title: {
    fontSize: responsiveFontSize(32),
    color: '#ffffff',
    fontWeight: '300',
    textAlign: 'center',
  },
  titleBold: {
    fontSize: responsiveFontSize(32),
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  featuresContainer: {
    marginVertical: responsiveSpacing(20),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: responsiveSpacing(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsiveSpacing(20),
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: responsiveSpacing(16),
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: responsiveFontSize(13),
    color: 'rgba(255, 255, 255, 0.6)',
  },
  notificationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    padding: responsiveSpacing(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: responsiveSpacing(10),
    overflow: 'hidden',
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 1,
  },
  notifIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifIconGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: colors.primary,
    opacity: 0.15,
  },
  notifPrompt: {
    flex: 1,
    fontSize: responsiveFontSize(15),
    color: '#ffffff',
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  footer: {
    marginBottom: responsiveSpacing(10),
  },
  primaryButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  buttonGradient: {
    paddingVertical: 18,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  disabledButton: {
    opacity: 0.7,
  },
});

