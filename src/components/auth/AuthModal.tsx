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
  Alert,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing, Animations } from '../../constants';
import { getResponsiveValue, scale, fontScale } from '../../utils/responsive';
import Button from '../common/Button';
import TextInput from '../common/TextInput';
import { useAuthStore } from '../../stores/authStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

type AuthStep = 'initial' | 'email' | 'login' | 'register';
type AuthMode = 'login' | 'register';

export default function AuthModal({ visible, onClose }: AuthModalProps) {
  const { colors, activeTheme } = useTheme();
  const insets = useSafeAreaInsets();

  // Auth store
  const authSignIn = useAuthStore((state) => state.signIn);
  const authSignUp = useAuthStore((state) => state.signUp);
  const authSignInWithApple = useAuthStore((state) => state.signInWithApple);
  const authSignInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);
  const clearAuthError = useAuthStore((state) => state.clearError);

  // Animation values - single translateY, backdrop interpolated (Pikup pattern)
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  // Backdrop opacity interpolated from translateY (Pikup pattern)
  const backdropOpacity = translateY.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.5],
    outputRange: [0.5, 0],
    extrapolate: 'clamp',
  });

  // Form state
  const [step, setStep] = useState<AuthStep>('initial');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [dobError, setDobError] = useState('');

  // Pan responder with Pikup patterns
  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        // Store current position as offset (Pikup pattern)
        translateY.setOffset((translateY as any)._value);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy >= 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Flatten offset back into value (Pikup pattern)
        translateY.flattenOffset();

        const currentY = (translateY as any)._value;
        const velocity = gestureState.vy;

        const shouldClose = velocity > 1.5 || currentY > 200;

        if (shouldClose) {
          // Use timing for close - spring waits for oscillation to settle
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: false,
          }).start(() => {
            Keyboard.dismiss();
            clearAuthError();
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: false,
            tension: 100,
            friction: 12,
          }).start();
        }
      },
    })
  ).current;


  // Animate modal on visibility change
  useEffect(() => {
    if (visible) {
      resetForm();
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: false,
        tension: 100,
        friction: 12,
      }).start();
    } else {
      translateY.setValue(SCREEN_HEIGHT);
    }
  }, [visible, translateY]);

  const resetForm = () => {
    setStep('initial');
    setAuthMode('login');
    setEmail('');
    setPassword('');
    setDateOfBirth(null);
    setShowDatePicker(false);
    setShowPassword(false);
    setEmailError('');
    setPasswordError('');
    setDobError('');
  };

  const handleClose = () => {
    Keyboard.dismiss();
    clearAuthError();
    // Use timing for close - spring waits for oscillation to settle
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      onClose();
    });
  };

  const animateStepChange = (newStep: AuthStep) => {
    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: 80,
      useNativeDriver: true,
    }).start(() => {
      setStep(newStep);
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }).start();
    });
  };

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    if (value.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const validateDateOfBirth = (date: Date | null): boolean => {
    if (!date) {
      setDobError('Date of birth is required');
      return false;
    }
    const age = calculateAge(date);
    if (age < 16) {
      setDobError('You must be at least 16 years old to use Linkble');
      return false;
    }
    setDobError('');
    return true;
  };

  const handleEmailPress = () => {
    animateStepChange('email');
  };

  const handleApplePress = async () => {
    const result = await authSignInWithApple();
    if (result.success) {
      handleClose();
    } else if (result.error) {
      Alert.alert('Failed', result.error);
    }
    // If no success and no error, user cancelled - do nothing
  };

  const handleGooglePress = async () => {
    const result = await authSignInWithGoogle();
    if (result.success) {
      handleClose();
    } else if (result.error) {
      Alert.alert('Failed', result.error);
    }
  };

  const handleBack = () => {
    Keyboard.dismiss();
    if (step === 'login' || step === 'register') {
      animateStepChange('email');
    } else {
      animateStepChange('initial');
    }
  };

  const handleContinueWithEmail = () => {
    if (!validateEmail(email)) return;

    if (authMode === 'login') {
      animateStepChange('login');
    } else {
      animateStepChange('register');
    }
  };

  const handleLogin = async () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (isEmailValid && isPasswordValid) {
      const result = await authSignIn({ email, password });
      if (result.success) {
        handleClose();
      } else {
        Alert.alert('Sign In Failed', result.error || 'Please check your credentials and try again.');
      }
    }
  };

  const handleRegister = async () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isDobValid = validateDateOfBirth(dateOfBirth);

    if (isEmailValid && isPasswordValid && isDobValid && dateOfBirth) {
      const result = await authSignUp({
        email,
        password,
        fullName: email.split('@')[0], // Temporary: use email prefix as name
        dateOfBirth: dateOfBirth.toISOString().split('T')[0],
      });
      if (result.success) {
        Alert.alert(
          'Account Created',
          'Please check your email to verify your account.',
          [{ text: 'OK', onPress: handleClose }]
        );
      } else {
        Alert.alert('Registration Failed', result.error || 'Please try again.');
      }
    }
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      setDobError('');
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const padding = getResponsiveValue(scale(14), scale(16), scale(18));
  const buttonSpacing = getResponsiveValue(scale(10), scale(12), scale(14));
  const titleSize = getResponsiveValue(fontScale(18), fontScale(20), fontScale(22));

  const getTitle = (): string => {
    switch (step) {
      case 'initial':
        return 'Continue with';
      case 'email':
        return authMode === 'login' ? 'Sign In' : 'Create Account';
      case 'login':
        return 'Sign In';
      case 'register':
        return 'Create Account';
      default:
        return '';
    }
  };

  const renderInitialStep = () => (
    <>
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
  );

  const renderEmailStep = () => (
    <>
      {/* Auth mode toggle */}
      <View style={[styles.modeToggle, { backgroundColor: colors.background.tertiary }]}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            authMode === 'login' && {
              backgroundColor: colors.accent.primary,
            },
          ]}
          onPress={() => setAuthMode('login')}
        >
          <Text
            style={[
              Typography.buttonSmall,
              {
                color: authMode === 'login' ? '#FFFFFF' : colors.text.secondary,
              },
            ]}
          >
            Sign In
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeButton,
            authMode === 'register' && {
              backgroundColor: colors.accent.primary,
            },
          ]}
          onPress={() => setAuthMode('register')}
        >
          <Text
            style={[
              Typography.buttonSmall,
              {
                color: authMode === 'register' ? '#FFFFFF' : colors.text.secondary,
              },
            ]}
          >
            Create Account
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (emailError) setEmailError('');
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={emailError}
      />

      <View style={{ height: buttonSpacing }} />

      <Button
        title="Continue"
        onPress={handleContinueWithEmail}
        variant="primary"
      />
    </>
  );

  const renderLoginStep = () => (
    <>
      <Text style={[styles.emailDisplay, { color: colors.text.secondary }]}>
        {email}
      </Text>

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (passwordError) setPasswordError('');
        }}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        error={passwordError}
        rightIcon={
          <Text style={{ color: colors.text.secondary }}>
            {showPassword ? 'Hide' : 'Show'}
          </Text>
        }
        onRightIconPress={() => setShowPassword(!showPassword)}
      />

      <View style={{ height: buttonSpacing }} />

      <Button
        title="Sign In"
        onPress={handleLogin}
        variant="primary"
        disabled={isAuthLoading}
      />

      <TouchableOpacity style={styles.forgotPassword}>
        <Text style={[Typography.bodySmall, { color: colors.accent.primary }]}>
          Forgot password?
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderRegisterStep = () => (
    <>
      <Text style={[styles.emailDisplay, { color: colors.text.secondary }]}>
        {email}
      </Text>

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (passwordError) setPasswordError('');
        }}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        error={passwordError}
        rightIcon={
          <Text style={{ color: colors.text.secondary }}>
            {showPassword ? 'Hide' : 'Show'}
          </Text>
        }
        onRightIconPress={() => setShowPassword(!showPassword)}
      />

      <View style={{ height: buttonSpacing }} />

      {/* Date of Birth */}
      <TouchableOpacity
        style={[
          styles.dobButton,
          {
            backgroundColor: colors.background.secondary,
            borderColor: dobError ? colors.status.error : colors.border.primary,
          },
        ]}
        onPress={() => setShowDatePicker(true)}
      >
        <Text
          style={[
            Typography.body,
            {
              color: dateOfBirth ? colors.text.primary : colors.text.placeholder,
            },
          ]}
        >
          {dateOfBirth ? formatDate(dateOfBirth) : 'Date of Birth'}
        </Text>
      </TouchableOpacity>
      {dobError && (
        <Text style={[styles.dobError, { color: colors.status.error }]}>
          {dobError}
        </Text>
      )}

      {showDatePicker && (
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={dateOfBirth || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
            themeVariant={activeTheme}
            locale="en-GB"
          />
          {Platform.OS === 'ios' && (
            <Button
              title="Done"
              onPress={() => setShowDatePicker(false)}
              variant="outline"
              style={{ marginTop: Spacing.sm }}
            />
          )}
        </View>
      )}

      <View style={{ height: buttonSpacing }} />

      <Button
        title="Create Account"
        onPress={handleRegister}
        variant="primary"
        disabled={isAuthLoading}
      />

      <Text style={[styles.termsText, { color: colors.text.tertiary }]}>
        By creating an account, you agree to our{' '}
        <Text style={{ color: colors.accent.primary }}>Terms of Service</Text>
        {' '}and{' '}
        <Text style={{ color: colors.accent.primary }}>Privacy Policy</Text>
      </Text>
    </>
  );

  const renderContent = () => {
    switch (step) {
      case 'initial':
        return renderInitialStep();
      case 'email':
        return renderEmailStep();
      case 'login':
        return renderLoginStep();
      case 'register':
        return renderRegisterStep();
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={handleClose}
    >
      {/* Backdrop with dark overlay */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      {/* Modal content */}
      <KeyboardAvoidingView
        style={styles.modalWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.background.secondary,
              paddingHorizontal: padding,
              paddingBottom: insets.bottom + padding + 50,
              marginBottom: -50,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Handle bar */}
          <View
            {...handlePanResponder.panHandlers}
            style={styles.handleContainer}
          >
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
              {getTitle()}
            </Text>
            <View style={styles.backButtonContainer} />
          </View>

          {/* Content */}
          <Animated.View
            style={[styles.buttonsContainer, { gap: buttonSpacing, opacity: contentOpacity }]}
          >
            {renderContent()}
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Spacing.borderRadius.xl,
    borderTopRightRadius: Spacing.borderRadius.xl,
    paddingTop: scale(8),
  },
  handleContainer: {
    paddingTop: scale(12),
    paddingBottom: scale(12),
    alignItems: 'center',
    width: '100%',
  },
  handle: {
    width: scale(36),
    height: scale(4),
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(20),
    minHeight: scale(40),
  },
  backButtonContainer: {
    width: scale(60),
  },
  title: {
    ...Typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    paddingBottom: scale(8),
  },
  authButton: {
    paddingVertical: scale(16),
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: Spacing.borderRadius.md,
    padding: scale(4),
    marginBottom: Spacing.lg,
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Spacing.borderRadius.sm,
  },
  emailDisplay: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginTop: Spacing.lg,
  },
  dobButton: {
    paddingVertical: Spacing.inputPadding,
    paddingHorizontal: Spacing.inputPadding,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
  },
  dobError: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  datePickerContainer: {
    marginTop: Spacing.sm,
  },
  termsText: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: fontScale(18),
  },
});
