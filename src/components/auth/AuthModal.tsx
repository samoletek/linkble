import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Keyboard,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing, Animations } from '../../constants';
import { getResponsiveValue } from '../../utils/responsive';
import Button from '../common/Button';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

type AuthStep = 'initial' | 'email' | 'login' | 'register';

export default function AuthModal({ visible, onClose }: AuthModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Animation values
  const slideY = useRef(new Animated.Value(500)).current;
  const blurOpacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState<AuthStep>('initial');
  const [isDragging, setIsDragging] = useState(false);

  // Pan responder for drag-to-dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 2,
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderMove: (_, gestureState) => {
        const y = Math.max(0, gestureState.dy);
        dragY.setValue(y);
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose = gestureState.dy > 140 || gestureState.vy > 1.2;
        if (shouldClose) {
          Animated.timing(dragY, {
            toValue: 400,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            dragY.setValue(0);
          });
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
        setIsDragging(false);
      },
    })
  ).current;

  // Keyboard handling
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (e: any) => {
      Animated.timing(keyboardOffset, {
        toValue: -e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration || 250 : 250,
        useNativeDriver: true,
      }).start();
    };

    const onKeyboardHide = (e: any) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration || 250 : 250,
        useNativeDriver: true,
      }).start();
    };

    const showListener = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideListener = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [keyboardOffset]);

  // Animate modal on visibility change
  useEffect(() => {
    if (visible) {
      setStep('initial');
      // Slide in
      Animated.parallel([
        Animated.spring(slideY, {
          toValue: 0,
          useNativeDriver: true,
          damping: Animations.spring.damping,
          stiffness: Animations.spring.stiffness,
        }),
        Animated.timing(blurOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: 500,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(blurOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      // Reset keyboard offset
      keyboardOffset.setValue(0);
    }
  }, [visible, slideY, blurOpacity, keyboardOffset]);

  const handleEmailPress = () => {
    // TODO: Implement email auth flow
    setStep('email');
  };

  const handleApplePress = () => {
    // TODO: Implement Apple Sign In
    console.log('Apple Sign In pressed');
  };

  const handleGooglePress = () => {
    // TODO: Implement Google Sign In
    console.log('Google Sign In pressed');
  };

  const handleBack = () => {
    setStep('initial');
  };

  const padding = getResponsiveValue(14, 16, 18);
  const buttonSpacing = getResponsiveValue(10, 12, 14);
  const titleSize = getResponsiveValue(18, 20, 22);

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={onClose}
    >
      {/* Backdrop with blur */}
      <Animated.View style={[styles.backdrop, { opacity: blurOpacity }]}>
        <BlurView intensity={25} tint="dark" style={styles.blurView}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={onClose}
          />
        </BlurView>
      </Animated.View>

      {/* Modal content */}
      <View style={styles.modalWrapper}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.background.secondary,
              paddingHorizontal: padding,
              paddingBottom: insets.bottom + padding,
              transform: [
                {
                  translateY: Animated.add(
                    Animated.add(dragY, keyboardOffset),
                    slideY
                  ),
                },
              ],
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border.primary }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.backButtonContainer}>
              {step !== 'initial' && (
                <TouchableOpacity onPress={handleBack}>
                  <Text style={[Typography.body, { color: colors.text.secondary }]}>
                    Back
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <Text
              style={[
                styles.title,
                { fontSize: titleSize, color: colors.text.primary },
              ]}
            >
              {step === 'initial' ? 'Continue with' : 'Sign in'}
            </Text>
            <View style={styles.backButtonContainer} />
          </View>

          {/* Content */}
          <View style={[styles.buttonsContainer, { gap: buttonSpacing }]}>
            {step === 'initial' && (
              <>
                {/* Email button */}
                <TouchableOpacity
                  style={[
                    styles.authButton,
                    {
                      backgroundColor: colors.background.secondary,
                      borderColor: colors.border.primary,
                    },
                  ]}
                  onPress={handleEmailPress}
                >
                  <Text style={[Typography.button, { color: colors.text.primary }]}>
                    Continue with Email
                  </Text>
                </TouchableOpacity>

                {/* Apple Sign In (iOS only) */}
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[
                      styles.authButton,
                      {
                        backgroundColor: colors.background.secondary,
                        borderColor: colors.border.primary,
                      },
                    ]}
                    onPress={handleApplePress}
                  >
                    <Text style={[Typography.button, { color: colors.text.primary }]}>
                      Sign in with Apple
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Google Sign In */}
                <TouchableOpacity
                  style={[
                    styles.authButton,
                    {
                      backgroundColor: colors.background.secondary,
                      borderColor: colors.border.primary,
                    },
                  ]}
                  onPress={handleGooglePress}
                >
                  <Text style={[Typography.button, { color: colors.text.primary }]}>
                    Sign in with Google
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'email' && (
              <>
                <Text style={[Typography.body, { color: colors.text.secondary, textAlign: 'center', marginBottom: 16 }]}>
                  Email authentication will be implemented in the next phase.
                </Text>
                <Button
                  title="Back to options"
                  onPress={handleBack}
                  variant="outline"
                />
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blurView: {
    flex: 1,
  },
  backdropTouchable: {
    flex: 1,
  },
  modalWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
  },
  modalContent: {
    borderTopLeftRadius: Spacing.borderRadius.xl,
    borderTopRightRadius: Spacing.borderRadius.xl,
    paddingTop: 8,
  },
  handleContainer: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveValue(16, 20, 24),
    minHeight: 40,
  },
  backButtonContainer: {
    width: 60,
  },
  title: {
    ...Typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    paddingBottom: 8,
  },
  authButton: {
    paddingVertical: getResponsiveValue(14, 16, 18),
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
