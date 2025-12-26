import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponder,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { INTERESTS } from '../../utils/interests';

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
  const translateY = useRef(new Animated.Value(0)).current;

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
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

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
              <X size={24} color={colors.text.primary} weight="bold" />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text.primary }]}>Interests</Text>
            <TouchableOpacity onPress={handleSave} style={styles.checkButton}>
              <Check size={24} color={colors.text.primary} weight="bold" />
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
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleContainer: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  checkButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  title: {
    ...Typography.h3,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  counter: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  interestTag: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
  },
  interestText: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '500',
  },
});
