import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Animations } from '../../constants';
import { getResponsiveValue, scale, fontScale } from '../../utils/responsive';
import Button from '../../components/common/Button';
import AuthModal from '../../components/auth/AuthModal';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Background scale animation when modal opens
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(scaleValue, {
      toValue: showAuthModal ? Animations.backdrop.scale : 1,
      duration: Animations.backdrop.duration,
      useNativeDriver: true,
    }).start();
  }, [showAuthModal, scaleValue]);

  const handleGetStarted = () => {
    setShowAuthModal(true);
  };

  const handleCloseAuthModal = () => {
    setShowAuthModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <Animated.View
        style={[
          styles.contentContainer,
          {
            paddingTop: insets.top,
            transform: [{ scale: scaleValue }],
          },
        ]}
      >
        {/* Center content */}
        <View style={styles.centerContent}>
          <View style={styles.logoContainer}>
            <View
              style={[
                styles.logoWrapper,
                { shadowColor: colors.accent.primary },
              ]}
            >
              <Image
                source={require('../../../assets/logo/logo-original.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.appName, { color: colors.accent.primary }]}>
              Linkble
            </Text>
            <Text style={[styles.tagline, { color: colors.text.primary }]}>
              Connect. Discover. Experience.
            </Text>
          </View>
        </View>

        {/* Bottom button */}
        <View
          style={[
            styles.actionContainer,
            { paddingBottom: insets.bottom + getResponsiveValue(24, 32, 40) },
          ]}
        >
          <Button
            title="Get Started"
            onPress={handleGetStarted}
            variant="primary"
            style={showAuthModal ? styles.hiddenButton : undefined}
            disabled={showAuthModal}
          />
        </View>
      </Animated.View>

      {/* Auth Modal */}
      <AuthModal visible={showAuthModal} onClose={handleCloseAuthModal} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: getResponsiveValue(24, 32, 40),
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoWrapper: {
    marginBottom: scale(24),
    borderRadius: 40,
    overflow: 'hidden',
    // Glow effect
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 10,
  },
  logo: {
    width: scale(240),
    height: scale(240),
    borderRadius: 40,
  },
  appName: {
    ...Typography.h1,
    marginBottom: scale(12),
    fontSize: getResponsiveValue(32, 36, 42),
  },
  tagline: {
    ...Typography.h3,
    textAlign: 'center',
    fontSize: getResponsiveValue(16, 18, 20),
    opacity: 0.8,
  },
  actionContainer: {
    paddingHorizontal: getResponsiveValue(0, 16, 32),
  },
  hiddenButton: {
    opacity: 0,
  },
});
