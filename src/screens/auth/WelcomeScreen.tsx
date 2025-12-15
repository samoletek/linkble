import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Animations } from '../../constants';
import { getResponsiveValue } from '../../utils/responsive';
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
            {/* Logo placeholder - replace with actual logo */}
            <View
              style={[
                styles.logoPlaceholder,
                {
                  borderColor: colors.accent.primary,
                  shadowColor: colors.accent.primary,
                },
              ]}
            >
              <Text style={[styles.logoText, { color: colors.accent.primary }]}>
                L
              </Text>
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
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    // Glow effect
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '700',
  },
  appName: {
    ...Typography.h1,
    marginBottom: 12,
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
