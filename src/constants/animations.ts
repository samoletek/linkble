/**
 * Animation constants for consistent motion
 * Based on client specs - smooth 60fps animations
 */
import { Easing } from 'react-native';

// Custom easeOutCubic easing
export const easeOutCubic = Easing.bezier(0.33, 1, 0.68, 1);

export const Animations = {
  // Timing durations (in ms)
  duration: {
    instant: 80,
    fast: 120,
    normal: 180,
    medium: 250,
    slow: 300,
  },

  // Button press animation
  button: {
    pressScale: 0.96,
    duration: 100,
  },

  // Tab icon animation
  tab: {
    activeScale: 1.15,
    duration: 120,
  },

  // Card animations
  card: {
    pressScale: 0.97,
    pressDuration: 150,
    appearSlideY: 20,
    appearDuration: 200,
    staggerDelay: 50,
  },

  // Bottom sheet
  bottomSheet: {
    slideY: 20,
    duration: 250,
    contentFadeDuration: 150,
  },

  // Map pin
  mapPin: {
    dropY: -30,
    dropDuration: 250,
    bounceScale: 1.1,
    bounceDuration: 150,
  },

  // Message bubble
  message: {
    slideY: 10,
    duration: 120,
  },

  // Badge pop
  badge: {
    scaleMax: 1.2,
    duration: 160,
  },

  // Background scale (when modal opens)
  backdrop: {
    scale: 0.95,
    duration: 300,
  },

  // Spring config for natural motion
  spring: {
    damping: 20,
    stiffness: 180,
    mass: 1,
  },
} as const;

export default Animations;
