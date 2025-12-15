import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes based on standard mobile phone
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Scale a value horizontally based on screen width
 */
export const scale = (size: number): number => {
  return (SCREEN_WIDTH / guidelineBaseWidth) * size;
};

/**
 * Scale a value vertically based on screen height
 */
export const verticalScale = (size: number): number => {
  return (SCREEN_HEIGHT / guidelineBaseHeight) * size;
};

/**
 * Scale a value with a moderate factor (useful for font sizes)
 */
export const moderateScale = (size: number, factor = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

/**
 * Get responsive value based on screen size
 * @param small - Value for small screens (<375px)
 * @param medium - Value for medium screens (375-414px)
 * @param large - Value for large screens (>414px)
 */
export function getResponsiveValue<T>(small: T, medium: T, large: T): T {
  if (SCREEN_WIDTH < 375) return small;
  if (SCREEN_WIDTH <= 414) return medium;
  return large;
}

/**
 * Check if device is a tablet
 */
export const isTablet = (): boolean => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return aspectRatio < 1.6;
};

/**
 * Normalize font size across different pixel densities
 */
export const normalizeFontSize = (size: number): number => {
  const newSize = moderateScale(size);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const screenDimensions = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};
