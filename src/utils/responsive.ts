import { Dimensions, PixelRatio } from 'react-native';
import { useEffect, useState } from 'react';

const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

const MAX_SCALE_FACTOR = 1.3;
const MIN_SCALE_FACTOR = 0.85;

const MAX_FONT_SCALE_FACTOR = 1.2;
const MIN_FONT_SCALE_FACTOR = 0.9;

const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

let screenDimensions = getScreenDimensions();

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const getRawScaleFactor = (): number => {
  return screenDimensions.width / GUIDELINE_BASE_WIDTH;
};

const getRawVerticalScaleFactor = (): number => {
  return screenDimensions.height / GUIDELINE_BASE_HEIGHT;
};

export const scale = (size: number): number => {
  const scaleFactor = clamp(getRawScaleFactor(), MIN_SCALE_FACTOR, MAX_SCALE_FACTOR);
  return Math.round(size * scaleFactor);
};

export const verticalScale = (size: number): number => {
  const scaleFactor = clamp(getRawVerticalScaleFactor(), MIN_SCALE_FACTOR, MAX_SCALE_FACTOR);
  return Math.round(size * scaleFactor);
};

export const moderateScale = (size: number, factor = 0.3): number => {
  const rawScale = getRawScaleFactor();
  const clampedScale = clamp(rawScale, MIN_FONT_SCALE_FACTOR, MAX_FONT_SCALE_FACTOR);
  const result = size + (size * clampedScale - size) * factor;
  return Math.round(result);
};

export const fontScale = (size: number): number => {
  const scaled = moderateScale(size, 0.3);
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

export const lineHeightScale = (size: number): number => {
  return moderateScale(size, 0.35);
};

export const iconScale = (size: number): number => {
  return moderateScale(size, 0.4);
};

export function getResponsiveValue<T>(small: T, medium: T, large: T): T {
  const { width } = screenDimensions;
  if (width < 375) return small;
  if (width <= 414) return medium;
  return large;
}

export const isTablet = (): boolean => {
  const { width, height } = screenDimensions;
  const aspectRatio = height / width;
  return aspectRatio < 1.6;
};

export const isSmallDevice = (): boolean => {
  return screenDimensions.width < 375;
};

export const isLargeDevice = (): boolean => {
  return screenDimensions.width > 414;
};

export const useResponsive = () => {
  const [dimensions, setDimensions] = useState(getScreenDimensions());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const newDimensions = { width: window.width, height: window.height };
      screenDimensions = newDimensions;
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
    scale,
    verticalScale,
    moderateScale,
    fontScale,
    iconScale,
  };
};

export { screenDimensions };

export const rs = {
  s: scale,
  vs: verticalScale,
  fs: fontScale,
  lh: lineHeightScale,
  is: iconScale,
  ms: moderateScale,
};
