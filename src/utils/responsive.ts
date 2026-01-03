import { Dimensions, PixelRatio } from 'react-native';
import { useEffect, useState } from 'react';

// Guideline sizes based on iPhone 14 (standard design target)
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

// Scale limits to prevent extreme scaling on tablets/large devices
const MAX_SCALE_FACTOR = 1.3;  // Maximum +30% from base
const MIN_SCALE_FACTOR = 0.85; // Minimum -15% from base

// For fonts - more conservative scaling
const MAX_FONT_SCALE_FACTOR = 1.2;  // Maximum +20% for fonts
const MIN_FONT_SCALE_FACTOR = 0.9;  // Minimum -10% for fonts

/**
 * Get current screen dimensions (reactive to orientation changes)
 */
const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

let screenDimensions = getScreenDimensions();

/**
 * Clamp a value between min and max
 */
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Get raw scale factor (without limits)
 */
const getRawScaleFactor = (): number => {
  return screenDimensions.width / GUIDELINE_BASE_WIDTH;
};

/**
 * Get raw vertical scale factor (without limits)
 */
const getRawVerticalScaleFactor = (): number => {
  return screenDimensions.height / GUIDELINE_BASE_HEIGHT;
};

/**
 * Scale a value horizontally based on screen width
 * Clamped to prevent extreme scaling on tablets
 */
export const scale = (size: number): number => {
  const scaleFactor = clamp(getRawScaleFactor(), MIN_SCALE_FACTOR, MAX_SCALE_FACTOR);
  return Math.round(size * scaleFactor);
};

/**
 * Scale a value vertically based on screen height
 * Clamped to prevent extreme scaling
 */
export const verticalScale = (size: number): number => {
  const scaleFactor = clamp(getRawVerticalScaleFactor(), MIN_SCALE_FACTOR, MAX_SCALE_FACTOR);
  return Math.round(size * scaleFactor);
};

/**
 * Scale a value with a moderate factor (best for font sizes)
 * Uses more conservative limits for readable typography
 * @param size - Base size in pixels
 * @param factor - How much of the scale difference to apply (0-1, default 0.3)
 */
export const moderateScale = (size: number, factor = 0.3): number => {
  const rawScale = getRawScaleFactor();
  const clampedScale = clamp(rawScale, MIN_FONT_SCALE_FACTOR, MAX_FONT_SCALE_FACTOR);
  const result = size + (size * clampedScale - size) * factor;
  return Math.round(result);
};

/**
 * Scale specifically for fonts with pixel density normalization
 * @param size - Base font size in pixels
 */
export const fontScale = (size: number): number => {
  const scaled = moderateScale(size, 0.3);
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * Scale for line heights (slightly more aggressive than fonts)
 * @param size - Base line height in pixels
 */
export const lineHeightScale = (size: number): number => {
  return moderateScale(size, 0.35);
};

/**
 * Scale for icons (moderate scaling)
 * @param size - Base icon size in pixels
 */
export const iconScale = (size: number): number => {
  return moderateScale(size, 0.4);
};

/**
 * Get responsive value based on screen size breakpoints
 * @param small - Value for small screens (<375px)
 * @param medium - Value for medium screens (375-414px)
 * @param large - Value for large screens (>414px)
 */
export function getResponsiveValue<T>(small: T, medium: T, large: T): T {
  const { width } = screenDimensions;
  if (width < 375) return small;
  if (width <= 414) return medium;
  return large;
}

/**
 * Check if device is a tablet based on aspect ratio
 */
export const isTablet = (): boolean => {
  const { width, height } = screenDimensions;
  const aspectRatio = height / width;
  return aspectRatio < 1.6;
};

/**
 * Check if device is a small phone (<375px width)
 */
export const isSmallDevice = (): boolean => {
  return screenDimensions.width < 375;
};

/**
 * Check if device is a large phone or tablet (>414px width)
 */
export const isLargeDevice = (): boolean => {
  return screenDimensions.width > 414;
};

/**
 * Hook for reactive screen dimensions
 * Updates when screen size changes (orientation, split view, etc.)
 */
export const useResponsive = () => {
  const [dimensions, setDimensions] = useState(getScreenDimensions());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const newDimensions = { width: window.width, height: window.height };
      screenDimensions = newDimensions; // Update module-level cache
      setDimensions(newDimensions);
    });

    return () => subscription.remove();
  }, []);

  return {
    width: dimensions.width,
    height: dimensions.height,
    isTablet: isTablet(),
    isSmallDevice: isSmallDevice(),
    isLargeDevice: isLargeDevice(),
    // Expose scale functions for dynamic usage
    scale,
    verticalScale,
    moderateScale,
    fontScale,
    iconScale,
  };
};

/**
 * Get current screen dimensions (snapshot)
 */
export { screenDimensions };

/**
 * Shorthand aliases for common use cases
 */
export const rs = {
  // Spacing
  s: scale,
  vs: verticalScale,
  // Typography
  fs: fontScale,
  lh: lineHeightScale,
  // Icons
  is: iconScale,
  // Moderate
  ms: moderateScale,
};
