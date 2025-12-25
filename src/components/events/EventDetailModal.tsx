import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  PanResponder,
  Image,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Calendar, Users, Clock } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing, Animations } from '../../constants';
import Button from '../common/Button';
import { EventWithHost } from '../../types/database';

interface EventDetailModalProps {
  visible: boolean;
  event: EventWithHost | null;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 200;

// Format date for display
const formatEventDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

// Format time for display
const formatEventTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export default function EventDetailModal({
  visible,
  event,
  onClose,
}: EventDetailModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const slideY = useRef(new Animated.Value(600)).current;
  const blurOpacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        const y = Math.max(0, gestureState.dy);
        dragY.setValue(y);
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose = gestureState.dy > 150 || gestureState.vy > 1.0;
        if (shouldClose) {
          Animated.timing(dragY, {
            toValue: 600,
            duration: 200,
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
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
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
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: 600,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(blurOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideY, blurOpacity]);

  if (!event) return null;

  const hostName = event.host?.full_name || 'Unknown';
  const hostAvatar = event.host?.avatar_url;
  const spotsLeft = event.max_participants; // TODO: subtract actual participants when available

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: blurOpacity }]}>
        <BlurView intensity={25} tint="dark" style={styles.blurView}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={onClose}
          />
        </BlurView>
      </Animated.View>

      <View style={styles.modalWrapper}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.background.secondary,
              paddingBottom: insets.bottom + 16,
              transform: [
                {
                  translateY: Animated.add(dragY, slideY),
                },
              ],
            },
          ]}
        >
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border.primary }]} />
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <View style={[styles.closeButtonBg, { backgroundColor: colors.background.primary }]}>
              <X size={20} color={colors.text.primary} weight="bold" />
            </View>
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.headerImage, { backgroundColor: colors.background.tertiary }]} />

            <View style={styles.contentPadding}>
              <Text style={[styles.title, { color: colors.text.primary }]}>
                {event.title}
              </Text>

              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.background.tertiary }]}>
                    <Calendar size={18} color={colors.accent.primary} weight="bold" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>
                      Date
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                      {formatEventDate(event.start_time)}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.background.tertiary }]}>
                    <Clock size={18} color={colors.accent.primary} weight="bold" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>
                      Time
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                      {formatEventTime(event.start_time)}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.background.tertiary }]}>
                    <MapPin size={18} color={colors.accent.primary} weight="bold" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>
                      Location
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                      {event.location_address}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.background.tertiary }]}>
                    <Users size={18} color={colors.accent.primary} weight="bold" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>
                      Spots
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                      {spotsLeft} available
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border.primary }]} />

              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                About
              </Text>
              <Text style={[styles.description, { color: colors.text.secondary }]}>
                {event.description}
              </Text>

              <View style={[styles.divider, { backgroundColor: colors.border.primary }]} />

              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Host
              </Text>
              <View style={styles.hostContainer}>
                {hostAvatar ? (
                  <Image
                    source={{ uri: hostAvatar }}
                    style={styles.hostAvatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.hostAvatar,
                      styles.hostAvatarPlaceholder,
                      { backgroundColor: colors.accent.primary },
                    ]}
                  >
                    <Text style={styles.hostInitial}>
                      {hostName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={[styles.hostName, { color: colors.text.primary }]}>
                  {hostName}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Request to Join"
              onPress={() => {
                onClose();
              }}
            />
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
    maxHeight: '90%',
  },
  modalContent: {
    borderTopLeftRadius: Spacing.borderRadius.xl,
    borderTopRightRadius: Spacing.borderRadius.xl,
    maxHeight: '100%',
    overflow: 'hidden',
  },
  handleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
    zIndex: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 20,
  },
  closeButtonBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  headerImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    borderTopLeftRadius: Spacing.borderRadius.xl,
    borderTopRightRadius: Spacing.borderRadius.xl,
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    ...Typography.h2,
    marginBottom: 20,
  },
  infoSection: {
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...Typography.caption,
    marginBottom: 2,
  },
  infoValue: {
    ...Typography.bodyMedium,
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: 10,
  },
  description: {
    ...Typography.body,
    lineHeight: 22,
  },
  hostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  hostAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  hostName: {
    ...Typography.bodyMedium,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
});
