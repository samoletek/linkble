import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Calendar, Users, Clock, ChatCircle, Hourglass, PencilSimple, CheckCircle, DotsThreeVertical, Flag } from 'phosphor-react-native';
import CategoryIcon from '../common/CategoryIcon';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing, Animations } from '../../constants';
import Button from '../common/Button';
import { EventWithHost, EventWithDetails, EventParticipant, Profile } from '../../types/database';
import { useUserStore } from '../../stores/userStore';
import { getEvent, requestToJoin, leaveEvent, cancelEvent, getEventParticipants, respondToRequest, kickParticipant } from '../../services/events';
import { reportEvent } from '../../services/users';
import type { ReportReason } from '../../types/database';
import { scale, fontScale, iconScale, verticalScale } from '../../utils/responsive';

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'scam', label: 'Scam' },
  { value: 'violence', label: 'Violence' },
  { value: 'other', label: 'Other' },
];

interface EventDetailModalProps {
  visible: boolean;
  event: EventWithHost | null;
  onClose: () => void;
  onOpenChat?: (eventId: string) => void;
  onJoinSuccess?: () => void;
  onEdit?: (event: EventWithHost) => void;
  onViewProfile?: (userId: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = verticalScale(200);

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
  onEdit,
  onViewProfile,
}: EventDetailModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useUserStore((state) => state.profile);

  const [eventDetails, setEventDetails] = useState<EventWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [participants, setParticipants] = useState<{ participant: EventParticipant; profile: Profile }[]>([]);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);

  const slideY = useRef(new Animated.Value(600)).current;
  const blurOpacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const y = Math.max(0, gestureState.dy);
        dragY.setValue(y);
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose = gestureState.dy > 100 || gestureState.vy > 0.5;
        if (shouldClose) {
          const velocity = Math.max(gestureState.vy, 0.5);
          const remainingDistance = 600 - gestureState.dy;
          const duration = Math.min(300, remainingDistance / velocity);

          Animated.parallel([
            Animated.timing(dragY, {
              toValue: 600,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(blurOpacity, {
              toValue: 0,
              duration,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onCloseRef.current();
          });
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 15,
            stiffness: 150,
          }).start();
        }
      },
    })
  ).current;

  // Load full event details and participants when modal opens
  const loadEventData = useCallback(async () => {
    if (!event) return;

    setIsLoading(true);
    const [details, participantsList] = await Promise.all([
      getEvent(event.id),
      getEventParticipants(event.id),
    ]);
    setEventDetails(details);
    setParticipants(participantsList);
    setIsLoading(false);
  }, [event?.id]);

  useEffect(() => {
    if (visible && event) {
      loadEventData();
    } else {
      setEventDetails(null);
      setParticipants([]);
    }
  }, [visible, event?.id, loadEventData]);

  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
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
      slideY.setValue(600);
      blurOpacity.setValue(0);
      dragY.setValue(0);
    }
  }, [visible, slideY, blurOpacity, dragY]);

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

  const handleRespondToRequest = useCallback(async (participantId: string, accept: boolean) => {
    setRespondingTo(participantId);

    const { error: respondError } = await respondToRequest(participantId, accept);

    if (respondError) {
      Alert.alert('Error', respondError.message);
      setRespondingTo(null);
      return;
    }

    // Reload data after response
    await loadEventData();
    setRespondingTo(null);
  }, [loadEventData]);

  const handleKickParticipant = useCallback(async (userId: string, userName: string) => {
    if (!event) return;

    Alert.alert(
      'Remove Participant',
      `Are you sure you want to remove ${userName} from this event?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRespondingTo(userId);
            const { error: kickError } = await kickParticipant(event.id, userId);

            if (kickError) {
              Alert.alert('Error', kickError.message);
              setRespondingTo(null);
              return;
            }

            await loadEventData();
            setRespondingTo(null);
          },
        },
      ]
    );
  }, [event, loadEventData]);

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

  const handleReport = useCallback(() => {
    setShowMenu(false);
    setShowReportModal(true);
  }, []);

  const submitReport = useCallback(async () => {
    if (!currentUser || !event || !selectedReason) return;

    try {
      await reportEvent(currentUser.id, event.id, selectedReason);
      setShowReportModal(false);
      setSelectedReason(null);
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    } catch (error) {
      console.error('Failed to submit report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  }, [currentUser, event, selectedReason]);

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
          style={{ backgroundColor: colors.background.tertiary, borderRadius: 12, height: scale(48), paddingVertical: 0 }}
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
          <Hourglass size={iconScale(20)} color={colors.text.secondary} weight="bold" />
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
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.background.secondary,
              paddingBottom: insets.bottom + scale(16),
              transform: [
                {
                  translateY: Animated.add(dragY, slideY),
                },
              ],
            },
          ]}
        >
          <Animated.View
            {...panResponder.panHandlers}
            style={styles.handleContainer}
          >
            <View style={[styles.handle, { backgroundColor: colors.border.primary }]} />
          </Animated.View>

          {!isHost && (
            <TouchableOpacity
              onPress={() => setShowMenu(true)}
              style={styles.menuButton}
            >
              <View style={[styles.closeButtonBg, { backgroundColor: colors.background.primary }]}>
                <DotsThreeVertical size={iconScale(20)} color={colors.text.primary} weight="bold" />
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <View style={[styles.closeButtonBg, { backgroundColor: colors.background.primary }]}>
              <X size={iconScale(20)} color={colors.text.primary} weight="bold" />
            </View>
          </TouchableOpacity>

          <Animated.ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
          >
            <Animated.View
              style={[
                styles.headerImageContainer,
                {
                  transform: [
                    {
                      translateY: scrollY.interpolate({
                        inputRange: [-IMAGE_HEIGHT, 0, 1],
                        outputRange: [-IMAGE_HEIGHT / 2, 0, 0],
                      }),
                    },
                    {
                      scale: scrollY.interpolate({
                        inputRange: [-IMAGE_HEIGHT, 0, 1],
                        outputRange: [2, 1, 1],
                      }),
                    },
                  ],
                },
              ]}
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
            </Animated.View>

            <View style={styles.contentPadding}>
              <Text style={[styles.title, { color: colors.text.primary }]}>
                {event.title}
              </Text>

              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <View style={[styles.iconContainer, { backgroundColor: event.category?.color + '20' }]}>
                    <CategoryIcon
                      categoryName={event.category?.name || 'sports_hobbies'}
                      size={iconScale(18)}
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
                    <Calendar size={iconScale(18)} color={colors.accent.primary} weight="bold" />
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
                    <Clock size={iconScale(18)} color={colors.accent.primary} weight="bold" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>
                      Time
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                      {event.end_time
                        ? `${formatEventTime(event.start_time)} - ${formatEventTime(event.end_time)}`
                        : formatEventTime(event.start_time)}
                    </Text>
                    {!event.end_time && (
                      <Text style={[styles.infoLabel, { color: colors.text.tertiary, marginTop: scale(2) }]}>
                        Open-ended
                      </Text>
                    )}
                  </View>
                </View>

                {event.end_time && formatEventDate(event.start_time) !== formatEventDate(event.end_time) && (
                  <View style={styles.infoRow}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.background.tertiary }]}>
                      <Calendar size={iconScale(18)} color={colors.accent.primary} weight="bold" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>
                        End Date
                      </Text>
                      <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                        {formatEventDate(event.end_time)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.background.tertiary }]}>
                    <MapPin size={iconScale(18)} color={colors.accent.primary} weight="bold" />
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
                    <Users size={iconScale(18)} color={colors.accent.primary} weight="bold" />
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
              <TouchableOpacity
                style={styles.hostContainer}
                onPress={() => {
                  if (!isHost && onViewProfile && event.host_id) {
                    onClose();
                    onViewProfile(event.host_id);
                  }
                }}
                activeOpacity={isHost ? 1 : 0.7}
                disabled={isHost}
              >
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
              </TouchableOpacity>

              {/* Participants Section */}
              {participants.length > 0 && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border.primary }]} />

                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                    Participants
                  </Text>

                  {participants.map(({ participant, profile }) => {
                    const isPending = participant.status === 'pending';
                    const isRespondingToThis = respondingTo === participant.id;

                    return (
                      <View key={participant.id} style={styles.participantRow}>
                        <TouchableOpacity
                          style={styles.participantInfo}
                          onPress={() => {
                            if (onViewProfile && participant.user_id !== currentUser?.id) {
                              onClose();
                              onViewProfile(participant.user_id);
                            }
                          }}
                          activeOpacity={participant.user_id === currentUser?.id ? 1 : 0.7}
                          disabled={participant.user_id === currentUser?.id}
                        >
                          {profile.avatar_url ? (
                            <Image
                              source={{ uri: profile.avatar_url }}
                              style={styles.participantAvatar}
                            />
                          ) : (
                            <View
                              style={[
                                styles.participantAvatar,
                                styles.hostAvatarPlaceholder,
                                { backgroundColor: colors.accent.secondary },
                              ]}
                            >
                              <Text style={styles.participantInitial}>
                                {profile.full_name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={styles.participantNameContainer}>
                            <Text style={[styles.participantName, { color: colors.text.primary }]}>
                              {profile.full_name}
                            </Text>
                            {isPending && (
                              <Text style={[styles.pendingLabel, { color: colors.text.tertiary }]}>
                                Pending approval
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>

                        {/* Accept/Reject buttons for host on pending requests */}
                        {isHost && isPending && (
                          <View style={styles.participantActions}>
                            {isRespondingToThis ? (
                              <ActivityIndicator size="small" color={colors.accent.primary} />
                            ) : (
                              <>
                                <TouchableOpacity
                                  style={[styles.actionButton, styles.rejectButton, { backgroundColor: colors.background.tertiary }]}
                                  onPress={() => handleRespondToRequest(participant.id, false)}
                                >
                                  <X size={iconScale(18)} color={colors.status.error} weight="bold" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.actionButton, styles.acceptButton, { backgroundColor: colors.status.success }]}
                                  onPress={() => handleRespondToRequest(participant.id, true)}
                                >
                                  <CheckCircle size={iconScale(18)} color="#FFFFFF" weight="bold" />
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        )}

                        {/* Kick button for host on accepted participants */}
                        {isHost && !isPending && participant.user_id !== currentUser?.id && (
                          <View style={styles.participantActions}>
                            {respondingTo === participant.user_id ? (
                              <ActivityIndicator size="small" color={colors.accent.primary} />
                            ) : (
                              <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.background.tertiary }]}
                                onPress={() => handleKickParticipant(participant.user_id, profile.full_name)}
                              >
                                <X size={iconScale(18)} color={colors.status.error} weight="bold" />
                              </TouchableOpacity>
                            )}
                          </View>
                        )}

                        {/* Show "You" badge if participant is current user */}
                        {participant.user_id === currentUser?.id && (
                          <View style={[styles.youBadge, { backgroundColor: colors.accent.primary }]}>
                            <Text style={styles.youBadgeText}>You</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          </Animated.ScrollView>

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
                  <ChatCircle size={iconScale(22)} color={colors.text.primary} weight="bold" />
                </TouchableOpacity>
              )}
              {isHost && onEdit && (
                <TouchableOpacity
                  style={[styles.chatButton, { backgroundColor: colors.background.tertiary }]}
                  onPress={() => {
                    onClose();
                    onEdit(event);
                  }}
                >
                  <PencilSimple size={iconScale(22)} color={colors.text.primary} weight="bold" />
                </TouchableOpacity>
              )}
              <View style={styles.joinButtonContainer}>
                {renderActionButton()}
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View
            style={[styles.menuContent, { backgroundColor: colors.background.secondary }]}
            onStartShouldSetResponder={() => true}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleReport}
              activeOpacity={0.7}
            >
              <Flag size={iconScale(20)} color={colors.text.primary} weight="regular" />
              <Text style={[styles.menuItemText, { color: colors.text.primary }]}>
                Report Event
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowReportModal(false)}
        >
          <View
            style={[styles.reportContent, { backgroundColor: colors.background.secondary }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.reportTitle, { color: colors.text.primary }]}>
              Report Event
            </Text>
            <Text style={[styles.reportSubtitle, { color: colors.text.secondary }]}>
              Why are you reporting this event?
            </Text>
            <View style={styles.reasonsList}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reasonChip,
                    {
                      backgroundColor: selectedReason === reason.value
                        ? colors.accent.primary
                        : colors.background.tertiary,
                    },
                  ]}
                  onPress={() => setSelectedReason(reason.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.reasonChipText,
                      {
                        color: selectedReason === reason.value
                          ? '#FFFFFF'
                          : colors.text.primary,
                      },
                    ]}
                  >
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.reportButtons}>
              <TouchableOpacity
                style={[styles.reportButton, { backgroundColor: colors.background.tertiary }]}
                onPress={() => {
                  setShowReportModal(false);
                  setSelectedReason(null);
                }}
              >
                <Text style={[styles.reportButtonText, { color: colors.text.secondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reportButton,
                  {
                    backgroundColor: selectedReason
                      ? colors.status.error
                      : colors.background.tertiary,
                  },
                ]}
                onPress={submitReport}
                disabled={!selectedReason}
              >
                <Text
                  style={[
                    styles.reportButtonText,
                    { color: selectedReason ? '#FFFFFF' : colors.text.tertiary },
                  ]}
                >
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  handle: {
    width: scale(36),
    height: scale(4),
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    top: scale(12),
    right: scale(12),
    zIndex: 20,
  },
  closeButtonBg: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  headerImageContainer: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    overflow: 'hidden',
  },
  headerImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    borderTopLeftRadius: Spacing.borderRadius.xl,
    borderTopRightRadius: Spacing.borderRadius.xl,
  },
  contentPadding: {
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
  },
  title: {
    ...Typography.h2,
    marginBottom: scale(20),
  },
  infoSection: {
    gap: scale(14),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  iconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...Typography.caption,
    marginBottom: scale(2),
  },
  infoValue: {
    ...Typography.bodyMedium,
  },
  divider: {
    height: 1,
    marginVertical: scale(20),
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: scale(10),
  },
  description: {
    ...Typography.body,
    lineHeight: fontScale(22),
  },
  hostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: scale(20),
  },
  hostAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
  },
  hostAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostInitial: {
    color: '#FFFFFF',
    fontSize: fontScale(18),
    fontWeight: '600',
  },
  hostName: {
    ...Typography.bodyMedium,
    flex: 1,
  },
  youBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  youBadgeText: {
    color: '#FFFFFF',
    fontSize: fontScale(12),
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  chatButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonContainer: {
    flex: 1,
  },
  loadingButton: {
    height: scale(52),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusButton: {
    height: scale(52),
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
  },
  statusText: {
    ...Typography.bodyMedium,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  participantInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  participantAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
  },
  participantInitial: {
    color: '#FFFFFF',
    fontSize: fontScale(16),
    fontWeight: '600',
  },
  participantNameContainer: {
    flex: 1,
  },
  participantName: {
    ...Typography.bodyMedium,
  },
  pendingLabel: {
    ...Typography.caption,
    marginTop: scale(2),
  },
  participantActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  actionButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {},
  acceptButton: {},
  menuButton: {
    position: 'absolute',
    top: scale(12),
    left: scale(12),
    zIndex: 20,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  menuContent: {
    width: '80%',
    maxWidth: scale(300),
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(16),
    paddingHorizontal: scale(20),
    gap: scale(12),
  },
  menuItemText: {
    ...Typography.body,
    fontWeight: '500',
  },
  reportContent: {
    width: '90%',
    maxWidth: scale(340),
    borderRadius: scale(16),
    padding: scale(24),
  },
  reportTitle: {
    ...Typography.h3,
    marginBottom: scale(6),
  },
  reportSubtitle: {
    ...Typography.body,
    marginBottom: scale(20),
  },
  reasonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
  },
  reasonChip: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(20),
  },
  reasonChipText: {
    ...Typography.body,
    fontSize: fontScale(14),
  },
  reportButtons: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(24),
  },
  reportButton: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
  },
  reportButtonText: {
    ...Typography.bodyMedium,
  },
});
