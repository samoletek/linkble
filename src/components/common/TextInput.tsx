import React, { useState, useRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TextInputProps as RNTextInputProps,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing, Animations } from '../../constants';

interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export default function TextInput({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  onFocus,
  onBlur,
  ...props
}: TextInputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const borderColor = useRef(new Animated.Value(0)).current;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.timing(borderColor, {
      toValue: 1,
      duration: Animations.button.duration,
      useNativeDriver: false,
    }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    Animated.timing(borderColor, {
      toValue: 0,
      duration: Animations.button.duration,
      useNativeDriver: false,
    }).start();
    onBlur?.(e);
  };

  const animatedBorderColor = borderColor.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? colors.status.error : colors.border.primary,
      error ? colors.status.error : colors.accent.primary,
    ],
  });

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.text.primary }]}>
          {label}
        </Text>
      )}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.background.secondary,
            borderColor: animatedBorderColor,
          },
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <RNTextInput
          style={[
            styles.input,
            {
              color: colors.text.primary,
            },
            !!icon && styles.inputWithIcon,
            !!rightIcon && styles.inputWithRightIcon,
          ]}
          placeholderTextColor={colors.text.placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && (
        <Text style={[styles.error, { color: colors.status.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    overflow: 'hidden',
  },
  iconContainer: {
    paddingLeft: Spacing.inputPadding,
  },
  input: {
    flex: 1,
    fontFamily: Typography.body.fontFamily,
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as '400',
    paddingVertical: Spacing.inputPadding,
    paddingHorizontal: Spacing.inputPadding,
  },
  inputWithIcon: {
    paddingLeft: Spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: Spacing.xs,
  },
  rightIconContainer: {
    paddingRight: Spacing.inputPadding,
    paddingLeft: Spacing.sm,
  },
  error: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});
