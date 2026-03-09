import { scale } from '../utils/responsive';

export const Spacing = {
  xxs: scale(2),
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  xxl: scale(24),
  xxxl: scale(32),

  screenHorizontal: scale(16),
  screenVertical: scale(24),

  cardPadding: scale(16),
  cardMargin: scale(12),
  buttonPadding: scale(16),
  inputPadding: scale(14),

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
