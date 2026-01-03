import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { INTERESTS } from '../../utils/interests';
import { scale, fontScale, iconScale } from '../../utils/responsive';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.85;
const MAX_INTERESTS = 10;

interface InterestsModalProps {
  visible: boolean;
  selectedInterests: number[];
  onClose: () => void;
  onSave: (interests: number[]) => void;
}

export default function InterestsModal({
  visible,
  selectedInterests,
  onClose,
  onSave,
}: InterestsModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<number[]>([...selectedInterests]);
  const translateY = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const blurOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(blurOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      translateY.setValue(MODAL_HEIGHT);
      blurOpacity.setValue(0);
    }
  }, [visible, translateY, blurOpacity]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: MODAL_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  const toggleInterest = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      } else if (prev.length < MAX_INTERESTS) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const handleSave = () => {
    onSave(selected);
    Animated.timing(translateY, {
      toValue: MODAL_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: MODAL_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const isSelected = (id: number) => selected.includes(id);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.blurContainer, { opacity: blurOpacity }]}>
        <BlurView intensity={25} tint="dark" style={styles.blurView}>
          <TouchableOpacity
            style={styles.blurTouchable}
            activeOpacity={1}
            onPress={handleClose}
          />
        </BlurView>
      </Animated.View>

      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.background.primary,
              height: MODAL_HEIGHT,
              paddingBottom: insets.bottom,
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border.primary }]} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={iconScale(24)} color={colors.text.primary} weight="bold" />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text.primary }]}>Interests</Text>
            <TouchableOpacity onPress={handleSave} style={styles.checkButton}>
              <Check size={iconScale(24)} color={colors.text.primary} weight="bold" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Select up to {MAX_INTERESTS} interests
          </Text>

          <Text style={[styles.counter, { color: colors.text.tertiary }]}>
            {selected.length} / {MAX_INTERESTS} selected
          </Text>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.interestsContainer}
            showsVerticalScrollIndicator={false}
          >
            {INTERESTS.map((interest) => {
              const active = isSelected(interest.id);
              const disabled = !active && selected.length >= MAX_INTERESTS;

              return (
                <TouchableOpacity
                  key={interest.id}
                  onPress={() => toggleInterest(interest.id)}
                  disabled={disabled}
                  activeOpacity={0.7}
                  style={[
                    styles.interestTag,
                    {
                      backgroundColor: active
                        ? colors.accent.primary
                        : colors.background.secondary,
                      opacity: disabled ? 0.4 : 1,
                      borderWidth: active ? 0 : 1,
                      borderColor: colors.border.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.interestText,
                      {
                        color: active ? '#FFFFFF' : colors.text.primary,
                      },
                    ]}
                  >
                    {interest.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blurView: {
    flex: 1,
  },
  blurTouchable: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
  },
  handleContainer: {
    paddingTop: scale(8),
    paddingBottom: scale(4),
    alignItems: 'center',
  },
  handle: {
    width: scale(36),
    height: scale(4),
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingBottom: scale(12),
  },
  closeButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  checkButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  title: {
    ...Typography.h2,
    fontSize: fontScale(16),
    lineHeight: fontScale(24),
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    paddingHorizontal: scale(20),
  },
  counter: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: scale(8),
    marginBottom: scale(20),
  },
  scrollView: {
    flex: 1,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: scale(16),
    paddingBottom: scale(40),
    gap: scale(10),
  },
  interestTag: {
    paddingHorizontal: scale(18),
    paddingVertical: scale(12),
    borderRadius: scale(24),
  },
  interestText: {
    ...Typography.body,
    fontSize: fontScale(15),
    fontWeight: '500',
  },
});
