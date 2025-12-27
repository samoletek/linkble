import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Calendar, Users, Clock, ChatCircle, Hourglass } from 'phosphor-react-native';
import CategoryIcon from '../common/CategoryIcon';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing, Animations } from '../../constants';
import Button from '../common/Button';
import { EventWithHost, EventWithDetails } from '../../types/database';
import { useUserStore } from '../../stores/userStore';
import { getEvent, requestToJoin, leaveEvent, cancelEvent } from '../../services/events';

interface EventDetailModalProps {
  visible: boolean;
  event: EventWithHost | null;
  onClose: () => void;
  onOpenChat?: (eventId: string) => void;
  onJoinSuccess?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 200;

const formatEventDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

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
  onOpenChat,
  onJoinSuccess,
}: EventDetailModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useUserStore((state) => state.profile);

  const [eventDetails, setEventDetails] = useState<EventWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

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

  // Load full event details when modal opens
  useEffect(() => {
    if (visible && event) {
      setIsLoading(true);
      getEvent(event.id).then((details) => {
        setEventDetails(details);
        setIsLoading(false);
      });
    } else {
      setEventDetails(null);
    }
  }, [visible, event?.id]);

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

  const handleJoinRequest = useCallback(async () => {
    if (!event) return;

    setIsActionLoading(true);

    const { status, error: joinError } = await requestToJoin(event.id);

    setIsActionLoading(false);

    if (joinError) {
      Alert.alert('Cannot Join', joinError.message);
      return;
    }

    // Refresh event details
    const details = await getEvent(event.id);
    setEventDetails(details);

    if (status === 'accepted') {
      Alert.alert('Joined', 'You have joined the event.');
    } else {
      Alert.alert('Request Sent', 'Your request has been sent to the host.');
    }

    onJoinSuccess?.();
  }, [event, onJoinSuccess]);

  const handleLeaveEvent = useCallback(async () => {
    if (!event || !eventDetails) return;

    const startTime = new Date(event.start_time);
    const hoursUntilStart = (startTime.getTime() - Date.now()) / (1000 * 60 * 60);
    const deadline = event.is_private ? 24 : 1;

    if (hoursUntilStart < deadline) {
      Alert.alert(
        'Cannot Leave',
        `You cannot leave a ${event.is_private ? 'private' : 'public'} event less than ${deadline} hour(s) before it starts.`
      );
      return;
    }

    Alert.alert(
      'Leave Event',
      'Are you sure you want to leave this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setIsActionLoading(true);
            const { error: leaveError } = await leaveEvent(event.id);
            setIsActionLoading(false);

            if (leaveError) {
              Alert.alert('Error', leaveError.message);
              return;
            }

            const details = await getEvent(event.id);
            setEventDetails(details);
            onJoinSuccess?.();
          },
        },
      ]
    );
  }, [event, eventDetails, onJoinSuccess]);

  const handleCancelEvent = useCallback(async () => {
    if (!event) return;

    const startTime = new Date(event.start_time);
    const hoursUntilStart = (startTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilStart < 24) {
      Alert.alert(
        'Cannot Cancel',
        'You cannot cancel an event less than 24 hours before it starts.'
      );
      return;
    }

    Alert.alert(
      'Cancel Event',
      'Are you sure you want to cancel this event? This action cannot be undone.',
      [
        { text: 'Keep Event', style: 'cancel' },
        {
          text: 'Cancel Event',
          style: 'destructive',
          onPress: async () => {
            setIsActionLoading(true);
            const { error: cancelError } = await cancelEvent(event.id);
            setIsActionLoading(false);

            if (cancelError) {
              Alert.alert('Error', cancelError.message);
              return;
            }

            Alert.alert('Cancelled', 'The event has been cancelled.');
            onClose();
            onJoinSuccess?.();
          },
        },
      ]
    );
  }, [event, onClose, onJoinSuccess]);

  if (!event) return null;

  const hostName = event.host?.full_name || 'Unknown';
  const hostAvatar = event.host?.avatar_url;
  const isHost = currentUser?.id === event.host_id;
  const participantStatus = eventDetails?.participant_status;
  const participantsCount = eventDetails?.participants_count || 1;
  const spotsLeft = event.max_participants - participantsCount;

  // Determine button state
  const renderActionButton = () => {
    if (isLoading || isActionLoading) {
      return (
        <View style={styles.loadingButton}>
          <ActivityIndicator color={colors.accent.primary} />
        </View>
      );
    }

    if (isHost) {
      return (
        <Button
          title="Cancel Event"
          variant="secondary"
          onPress={handleCancelEvent}
          style={{ backgroundColor: colors.background.tertiary, borderRadius: 12, height: 48, paddingVertical: 0 }}
          textStyle={{ color: colors.status.error }}
        />
      );
    }

    if (participantStatus === 'accepted') {
      return (
        <Button
          title="Leave Event"
          variant="secondary"
          onPress={handleLeaveEvent}
        />
      );
    }

    if (participantStatus === 'pending') {
      return (
        <View style={[styles.statusButton, { backgroundColor: colors.background.tertiary }]}>
          <Hourglass size={20} color={colors.text.secondary} weight="bold" />
          <Text style={[styles.statusText, { color: colors.text.secondary }]}>
            Request Pending
          </Text>
        </View>
      );
    }

    if (participantStatus === 'rejected') {
      return (
        <View style={[styles.statusButton, { backgroundColor: colors.background.tertiary }]}>
          <Text style={[styles.statusText, { color: colors.text.secondary }]}>
            Request Declined
          </Text>
        </View>
      );
    }

    if (spotsLeft <= 0) {
      return (
        <View style={[styles.statusButton, { backgroundColor: colors.background.tertiary }]}>
          <Text style={[styles.statusText, { color: colors.text.secondary }]}>
            Event Full
          </Text>
        </View>
      );
    }

    return (
      <Button
        title={event.auto_accept ? 'Join Event' : 'Request to Join'}
        onPress={handleJoinRequest}
      />
    );
  };

  // Show chat button only for participants and host
  const canAccessChat = isHost || participantStatus === 'accepted';

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
            {event.image_url ? (
              <Image
                source={{ uri: event.image_url }}
                style={styles.headerImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.headerImage, { backgroundColor: colors.background.tertiary }]} />
            )}

            <View style={styles.contentPadding}>
              <Text style={[styles.title, { color: colors.text.primary }]}>
                {event.title}
              </Text>

              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <View style={[styles.iconContainer, { backgroundColor: event.category?.color + '20' }]}>
                    <CategoryIcon
                      categoryName={event.category?.name || 'sports_hobbies'}
                      size={18}
                      color={event.category?.color || colors.accent.primary}
                    />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>
                      Category
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                      {event.category?.display_name || 'Other'}
                    </Text>
                  </View>
                </View>

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
                      {participantsCount}/{event.max_participants} joined
                      {spotsLeft > 0 && ` (${spotsLeft} left)`}
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
                {isHost && (
                  <View style={[styles.youBadge, { backgroundColor: colors.accent.primary }]}>
                    <Text style={styles.youBadgeText}>You</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerButtons}>
              {canAccessChat && onOpenChat && (
                <TouchableOpacity
                  style={[styles.chatButton, { backgroundColor: colors.background.tertiary }]}
                  onPress={() => {
                    onClose();
                    onOpenChat(event.id);
                  }}
                >
                  <ChatCircle size={22} color={colors.text.primary} weight="bold" />
                </TouchableOpacity>
              )}
              <View style={styles.joinButtonContainer}>
                {renderActionButton()}
              </View>
            </View>
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
    flex: 1,
  },
  youBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  youBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonContainer: {
    flex: 1,
  },
  loadingButton: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusButton: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    ...Typography.bodyMedium,
  },
});
