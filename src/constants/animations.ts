import { Easing } from 'react-native';

export const easeOutCubic = Easing.bezier(0.33, 1, 0.68, 1);

export const Animations = {
  duration: {
    instant: 80,
    fast: 120,
    normal: 180,
    medium: 250,
    slow: 300,
  },

  button: {
    pressScale: 0.96,
    duration: 100,
  },

  tab: {
    activeScale: 1.15,
    duration: 120,
  },

  card: {
    pressScale: 0.97,
    pressDuration: 150,
    appearSlideY: 20,
    appearDuration: 200,
    staggerDelay: 50,
  },

  bottomSheet: {
    slideY: 20,
    duration: 250,
    contentFadeDuration: 150,
  },

  mapPin: {
    dropY: -30,
    dropDuration: 250,
    bounceScale: 1.1,
    bounceDuration: 150,
  },

  message: {
    slideY: 10,
    duration: 120,
  },

  badge: {
    scaleMax: 1.2,
    duration: 160,
  },

  backdrop: {
    scale: 0.95,
    duration: 300,
  },

  spring: {
    damping: 20,
    stiffness: 180,
    mass: 1,
  },
} as const;

export default Animations;
