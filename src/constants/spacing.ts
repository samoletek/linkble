/**
 * Spacing constants for consistent layout
 */

export const Spacing = {
  // Base spacing units
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,

  // Screen padding
  screenHorizontal: 16,
  screenVertical: 24,

  // Component spacing
  cardPadding: 16,
  cardMargin: 12,
  buttonPadding: 16,
  inputPadding: 14,

  // Border radius
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
} as const;

export const BORDER_RADIUS = Spacing.borderRadius;

export default Spacing;
