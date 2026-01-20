import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { X, Check } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { INTERESTS } from '../../utils/interests';
import { scale, fontScale, iconScale, verticalScale } from '../../utils/responsive';
import BaseModal from '../common/BaseModal';

const MAX_INTERESTS = 10;

interface InterestsModalProps {
  visible: boolean;
  selectedInterests: number[];
  onClose: () => void;
  onSave: (interests: number[]) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function InterestsModal({
  visible,
  selectedInterests,
  onClose,
  onSave,
}: InterestsModalProps) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<number[]>([...selectedInterests]);

  // Reset selection when modal opens
  useEffect(() => {
    if (visible) {
      setSelected([...selectedInterests]);
    }
  }, [visible, selectedInterests]);

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

  const isSelected = (id: number) => selected.includes(id);

  const [isSaving, setIsSaving] = useState(false);

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      height={SCREEN_HEIGHT * 0.85}
      renderHeader={(animateClose) => {
        const handleSaveAndClose = async () => {
          setIsSaving(true);
          try {
            await onSave(selected);
            animateClose();
          } catch (error) {
            console.error('Failed to save interests:', error);
          } finally {
            setIsSaving(false);
          }
        };

        return (
          <View style={styles.header}>
            <TouchableOpacity onPress={animateClose} style={styles.closeButton}>
              <X size={iconScale(24)} color={colors.text.primary} weight="bold" />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text.primary }]}>Interests</Text>
            <TouchableOpacity
              onPress={handleSaveAndClose}
              style={styles.checkButton}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.accent.primary} />
              ) : (
                <Check size={iconScale(24)} color={colors.text.primary} weight="bold" />
              )}
            </TouchableOpacity>
          </View>
        );
      }}
    >

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
    </BaseModal>
  );
}

const styles = StyleSheet.create({
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
