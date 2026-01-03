/**
 * Typography constants for Linkble app
 * Uses system fonts (San Francisco on iOS, Roboto on Android)
 * All sizes are responsive based on screen dimensions
 */
import { Platform, TextStyle } from 'react-native';
import { fontScale, lineHeightScale } from '../utils/responsive';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const Typography = {
  // Headers
  h1: {
    fontFamily,
    fontSize: fontScale(32),
    fontWeight: '700',
    lineHeight: lineHeightScale(40),
  } as TextStyle,

  h2: {
    fontFamily,
    fontSize: fontScale(24),
    fontWeight: '600',
    lineHeight: lineHeightScale(32),
  } as TextStyle,

  h3: {
    fontFamily,
    fontSize: fontScale(20),
    fontWeight: '600',
    lineHeight: lineHeightScale(28),
  } as TextStyle,

  h4: {
    fontFamily,
    fontSize: fontScale(18),
    fontWeight: '600',
    lineHeight: lineHeightScale(24),
  } as TextStyle,

  // Body text
  body: {
    fontFamily,
    fontSize: fontScale(16),
    fontWeight: '400',
    lineHeight: lineHeightScale(24),
  } as TextStyle,

  bodyMedium: {
    fontFamily,
    fontSize: fontScale(16),
    fontWeight: '500',
    lineHeight: lineHeightScale(24),
  } as TextStyle,

  bodySmall: {
    fontFamily,
    fontSize: fontScale(14),
    fontWeight: '400',
    lineHeight: lineHeightScale(20),
  } as TextStyle,

  // Button text
  button: {
    fontFamily,
    fontSize: fontScale(16),
    fontWeight: '600',
    lineHeight: lineHeightScale(20),
  } as TextStyle,

  buttonSmall: {
    fontFamily,
    fontSize: fontScale(14),
    fontWeight: '600',
    lineHeight: lineHeightScale(18),
  } as TextStyle,

  // Caption/Labels
  caption: {
    fontFamily,
    fontSize: fontScale(12),
    fontWeight: '400',
    lineHeight: lineHeightScale(16),
  } as TextStyle,

  label: {
    fontFamily,
    fontSize: fontScale(12),
    fontWeight: '500',
    lineHeight: lineHeightScale(16),
    letterSpacing: 0.5,
  } as TextStyle,
} as const;

export default Typography;
