import { useWindowDimensions, PixelRatio, Platform } from 'react-native';
import { Dimensions } from 'react-native';
import { BREAKPOINTS, getScreenSize } from '../utils/responsive';

interface ResponsiveScreenInfo {
  width: number;
  height: number;
  isPortrait: boolean;
  isLandscape: boolean;
  pixelRatio: number;
  fontScale: number;
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isSmallScreen: boolean;
  isMediumScreen: boolean;
  isLargeScreen: boolean;
  isTablet: boolean;
  isPhone: boolean;
  statusBarHeight: number;
}

export const useResponsiveScreen = (): ResponsiveScreenInfo => {
  const dimensions = useWindowDimensions();
  const pixelRatio = PixelRatio.get();
  const fontScale = PixelRatio.getFontScale();

  const isPortrait = dimensions.height > dimensions.width;
  const isLandscape = !isPortrait;

  const screenSize = getScreenSize(dimensions.width);
  const isSmallScreen = dimensions.width <= BREAKPOINTS.sm;
  const isMediumScreen = dimensions.width > BREAKPOINTS.sm && dimensions.width <= BREAKPOINTS.md;
  const isLargeScreen = dimensions.width > BREAKPOINTS.md;
  const isTablet = dimensions.width >= BREAKPOINTS.lg;
  const isPhone = !isTablet;

  const statusBarHeight = Platform.select({
    ios: isPortrait ? 44 : 0,
    android: 0,
  }) || 0;

  return {
    width: dimensions.width,
    height: dimensions.height,
    isPortrait,
    isLandscape,
    pixelRatio,
    fontScale,
    screenSize,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    isTablet,
    isPhone,
    statusBarHeight,
  };
};

export const useResponsiveDimensions = () => {
  const { width, height, pixelRatio, fontScale } = useResponsiveScreen();

  const wp = (percentage: number): number => {
    const value = (percentage * width) / 100;
    return Math.round(PixelRatio.roundToNearestPixel(value));
  };

  const hp = (percentage: number): number => {
    const value = (percentage * height) / 100;
    return Math.round(PixelRatio.roundToNearestPixel(value));
  };

  const responsiveFontSize = (size: number): number => {
    const scale = width / 375;
    const newSize = size * scale;
    const minSize = size * 0.8;
    const maxSize = size * 1.3;

    return Math.round(PixelRatio.roundToNearestPixel(
      Math.max(minSize, Math.min(maxSize, newSize))
    ));
  };

  const responsiveSpacing = (size: number): number => {
    const scale = Math.min(width / 375, 1.5);
    return Math.round(PixelRatio.roundToNearestPixel(size * scale));
  };

  const responsiveHeight = (baseHeight: number): number => {
    const scale = Math.min(height / 812, 1.2);
    return Math.round(PixelRatio.roundToNearestPixel(baseHeight * scale));
  };

  const responsiveWidth = (baseWidth: number): number => {
    const scale = Math.min(width / 375, 1.3);
    return Math.round(PixelRatio.roundToNearestPixel(baseWidth * scale));
  };

  const responsiveBorderRadius = (radius: number): number => {
    const scale = Math.min(width / 375, 1.2);
    return Math.round(radius * scale);
  };

  const responsiveIconSize = (size: number): number => {
    const screenSize = getScreenSize(width);

    const multipliers = {
      xs: 0.8,
      sm: 0.9,
      md: 1.0,
      lg: 1.2,
      xl: 1.4,
    };

    return Math.round(size * multipliers[screenSize]);
  };

  const getItemsPerRow = (): number => {
    const screenSize = getScreenSize(width);
    const isLandscape = width > height;

    if (isLandscape) {
      switch (screenSize) {
        case 'lg': return 8;
        case 'xl': return 10;
        default: return 6;
      }
    }

    switch (screenSize) {
      case 'xs': return 3;
      case 'sm': return 4;
      case 'md': return 4;
      case 'lg': return 6;
      case 'xl': return 8;
      default: return 4;
    }
  };

  const getGridItemWidth = (itemsPerRow: number, spacing: number = 16): number => {
    const totalSpacing = spacing * (itemsPerRow + 1);
    const availableWidth = width - totalSpacing;
    return Math.floor(availableWidth / itemsPerRow);
  };

  return {
    wp,
    hp,
    responsiveFontSize,
    responsiveSpacing,
    responsiveHeight,
    responsiveWidth,
    responsiveBorderRadius,
    responsiveIconSize,
    getItemsPerRow,
    getGridItemWidth,
  };
};

export default useResponsiveScreen;