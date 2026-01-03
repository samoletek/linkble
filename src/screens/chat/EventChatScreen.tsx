import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, PaperPlaneTilt, Crown, PushPin, Trash, Archive } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing } from '../../constants';
import { ChatStackParamList, MessageWithSender, EventWithHost } from '../../types';
import { useUserStore } from '../../stores/userStore';
import {
  getEventMessages,
  sendEventMessage,
  subscribeToEventMessages,
  unsubscribe,
  markEventMessagesAsRead,
  pinMessage,
  deleteMessage,
} from '../../services/messages';
import { supabase } from '../../config/supabase';
import EventDetailModal from '../../components/events/EventDetailModal';
import { scale, fontScale, iconScale } from '../../utils/responsive';

type EventChatRouteProp = RouteProp<ChatStackParamList, 'EventChat'>;
type NavigationProp = NativeStackNavigationProp<ChatStackParamList>;

interface EventInfo {
  id: string;
  title: string;
  host_id: string;
  description: string;
  category_id: number;
  location_lat: number;
  location_lng: number;
  location_address: string;
  start_time: string;
  end_time: string | null;
  max_participants: number;
  is_private: boolean;
  auto_accept: boolean;
  image_url: string | null;
  status: 'active' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
  host: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    username: string | null;
    bio: string | null;
    date_of_birth: string;
    interests: number[];
    push_token: string | null;
    created_at: string;
    updated_at: string;
    last_username_change: string | null;
  } | null;
  category: {
    id: number;
    name: string;
    display_name: string;
    icon: string;
    color: string;
  } | null;
}

export default function EventChatScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EventChatRouteProp>();
  const { eventId } = route.params;

  const currentUser = useUserStore((state) => state.profile);
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState<MessageWithSender | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageWithSender | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  // Load event info and messages
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Load full event info
      const { data: event } = await supabase
        .from('events')
        .select(`
          *,
          host:profiles!events_host_id_fkey(*),
          category:categories(*)
        `)
        .eq('id', eventId)
        .single();

      if (event) {
        const eventData = event as unknown as EventInfo;
        setEventInfo(eventData);
        // Check if event has ended (start_time is in the past)
        const eventStartTime = new Date(eventData.start_time);
        setIsArchived(eventStartTime < new Date());
      }

      // Load messages
      const eventMessages = await getEventMessages(eventId);
      setMessages(eventMessages);

      // Find pinned message
      const pinned = eventMessages.find(m => m.is_pinned);
      setPinnedMessage(pinned || null);

      setIsLoading(false);

      // Mark messages as read
      await markEventMessagesAsRead(eventId);
    };

    loadData();
  }, [eventId, currentUser]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = subscribeToEventMessages(
      eventId,
      async (newMessage) => {
        setMessages((prev) => [...prev, newMessage]);
        // Mark incoming messages as read immediately
        if (newMessage.user_id !== currentUser?.id) {
          await markEventMessagesAsRead(eventId);
        }
      }
    );

    return () => {
      unsubscribe(channel);
    };
  }, [eventId, currentUser?.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isSending) return;

    setIsSending(true);
    setInputText('');

    const { error } = await sendEventMessage(eventId, trimmedText);

    if (error) {
      setInputText(trimmedText);
    }

    setIsSending(false);
  }, [eventId, inputText, isSending]);

  const isHost = currentUser?.id === eventInfo?.host_id;

  const handleLongPress = useCallback((message: MessageWithSender) => {
    // Disable actions for archived chats
    if (isArchived) return;

    // Only host can manage messages, or user can delete their own
    const isOwnMessage = message.user_id === currentUser?.id;
    if (!isHost && !isOwnMessage) return;

    setSelectedMessage(message);
    setShowActionMenu(true);
  }, [isHost, currentUser?.id, isArchived]);

  const handlePinMessage = useCallback(async () => {
    if (!selectedMessage || !isHost) return;

    const shouldPin = !selectedMessage.is_pinned;
    const { error } = await pinMessage(selectedMessage.id, shouldPin);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // Update local state
      setMessages(prev => prev.map(m => ({
        ...m,
        is_pinned: m.id === selectedMessage.id ? shouldPin : false,
      })));
      setPinnedMessage(shouldPin ? { ...selectedMessage, is_pinned: true } : null);
    }

    setShowActionMenu(false);
    setSelectedMessage(null);
  }, [selectedMessage, isHost]);

  const handleDeleteMessage = useCallback(async () => {
    if (!selectedMessage) return;

    Alert.alert(
      'Delete Message',
      'This message will be deleted for everyone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteMessage(selectedMessage.id);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              setMessages(prev => prev.filter(m => m.id !== selectedMessage.id));
              if (pinnedMessage?.id === selectedMessage.id) {
                setPinnedMessage(null);
              }
            }

            setShowActionMenu(false);
            setSelectedMessage(null);
          },
        },
      ]
    );
  }, [selectedMessage, pinnedMessage]);

  const closeActionMenu = useCallback(() => {
    setShowActionMenu(false);
    setSelectedMessage(null);
  }, []);

  const handleViewProfile = useCallback((userId: string) => {
    if (userId !== currentUser?.id) {
      navigation.navigate('UserProfile', { userId });
    }
  }, [currentUser?.id, navigation]);

  const renderMessage = ({ item }: { item: MessageWithSender }) => {
    const isOwnMessage = item.user_id === currentUser?.id;
    const isHostMessage = item.user_id === eventInfo?.host_id;
    const senderName = item.sender?.full_name || 'Unknown';
    const senderAvatar = item.sender?.avatar_url;
    const canManageMessage = isHost || isOwnMessage;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => canManageMessage && handleLongPress(item)}
        delayLongPress={300}
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isOwnMessage && (
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => item.user_id && handleViewProfile(item.user_id)}
            activeOpacity={0.7}
          >
            {senderAvatar ? (
              <Image source={{ uri: senderAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.accent.primary }]}>
                <Text style={styles.avatarInitial}>
                  {senderName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        <View style={[styles.messageBubbleWrapper, isOwnMessage && styles.ownBubbleWrapper]}>
          {!isOwnMessage && (
            <TouchableOpacity
              style={styles.senderInfo}
              onPress={() => item.user_id && handleViewProfile(item.user_id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.senderName, { color: colors.text.secondary }]}>
                {senderName}
              </Text>
              {isHostMessage && (
                <Crown size={iconScale(12)} color={colors.accent.primary} weight="fill" style={styles.hostBadge} />
              )}
            </TouchableOpacity>
          )}
          <View
            style={[
              styles.messageBubble,
              isOwnMessage
                ? { backgroundColor: colors.accent.primary }
                : { backgroundColor: colors.background.tertiary },
            ]}
          >
            <Text
              style={[
                styles.messageText,
                { color: isOwnMessage ? '#FFFFFF' : colors.text.primary },
              ]}
            >
              {item.content}
            </Text>
          </View>
          <View style={[styles.messageFooter, isOwnMessage && styles.ownMessageFooter]}>
            <Text style={[styles.messageTime, { color: colors.text.tertiary }]}>
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Convert EventInfo to EventWithHost format for modal
  const eventForModal = eventInfo ? {
    id: eventInfo.id,
    host_id: eventInfo.host_id,
    title: eventInfo.title,
    description: eventInfo.description,
    category_id: eventInfo.category_id,
    location_lat: eventInfo.location_lat,
    location_lng: eventInfo.location_lng,
    location_address: eventInfo.location_address,
    start_time: eventInfo.start_time,
    end_time: eventInfo.end_time,
    max_participants: eventInfo.max_participants,
    is_private: eventInfo.is_private,
    auto_accept: eventInfo.auto_accept,
    image_url: eventInfo.image_url,
    status: eventInfo.status,
    created_at: eventInfo.created_at,
    updated_at: eventInfo.updated_at,
    host: eventInfo.host as EventWithHost['host'],
    category: eventInfo.category as EventWithHost['category'],
  } as EventWithHost : null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: colors.border.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={iconScale(24)} color={colors.text.primary} weight="bold" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => setShowEventModal(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {eventInfo?.title || 'Event Chat'}
          </Text>
          {eventInfo?.host && (
            <View style={styles.hostInfo}>
              <Crown size={iconScale(12)} color={colors.accent.primary} weight="fill" />
              <Text style={[styles.hostName, { color: colors.text.secondary }]}>
                {eventInfo.host.full_name}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerRight} />
      </View>

      {/* Pinned Message */}
      {pinnedMessage && (
        <TouchableOpacity
          style={[styles.pinnedContainer, { backgroundColor: colors.background.secondary, borderBottomColor: colors.border.primary }]}
          onPress={() => {
            const index = messages.findIndex(m => m.id === pinnedMessage.id);
            if (index !== -1) {
              flatListRef.current?.scrollToIndex({ index, animated: true });
            }
          }}
          activeOpacity={0.7}
        >
          <PushPin size={iconScale(16)} color={colors.accent.primary} weight="fill" />
          <View style={styles.pinnedContent}>
            <Text style={[styles.pinnedLabel, { color: colors.accent.primary }]}>
              Pinned Message
            </Text>
            <Text style={[styles.pinnedText, { color: colors.text.secondary }]} numberOfLines={1}>
              {pinnedMessage.content}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                No messages yet
              </Text>
              <Text style={[styles.emptyHint, { color: colors.text.tertiary }]}>
                Be the first to say something
              </Text>
            </View>
          }
        />
      )}

      {/* Input or Archived Banner */}
      {isArchived ? (
        <View
          style={[
            styles.archivedBanner,
            {
              backgroundColor: colors.background.secondary,
              borderTopColor: colors.border.primary,
              paddingBottom: insets.bottom || scale(16),
            },
          ]}
        >
          <Archive size={iconScale(18)} color={colors.text.tertiary} weight="fill" />
          <Text style={[styles.archivedText, { color: colors.text.tertiary }]}>
            This event has ended. Chat is read-only.
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.background.primary,
              borderTopColor: colors.border.primary,
              paddingBottom: insets.bottom || scale(16),
            },
          ]}
        >
          <View style={[styles.inputWrapper, { backgroundColor: colors.background.secondary }]}>
            <TextInput
              style={[styles.input, { color: colors.text.primary }]}
              placeholder="Message..."
              placeholderTextColor={colors.text.placeholder}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() ? colors.accent.primary : colors.background.tertiary,
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <PaperPlaneTilt
                size={iconScale(20)}
                color={inputText.trim() ? '#FFFFFF' : colors.text.tertiary}
                weight="fill"
              />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Action Menu Modal */}
      <Modal
        visible={showActionMenu}
        transparent
        animationType="fade"
        onRequestClose={closeActionMenu}
      >
        <TouchableWithoutFeedback onPress={closeActionMenu}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.actionMenu, { backgroundColor: colors.background.secondary }]}>
                {isHost && selectedMessage && (
                  <TouchableOpacity
                    style={styles.actionMenuItem}
                    onPress={handlePinMessage}
                  >
                    <PushPin size={iconScale(20)} color={colors.text.primary} weight="bold" />
                    <Text style={[styles.actionMenuText, { color: colors.text.primary }]}>
                      {selectedMessage.is_pinned ? 'Unpin Message' : 'Pin Message'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={handleDeleteMessage}
                >
                  <Trash size={iconScale(20)} color={colors.status.error} weight="bold" />
                  <Text style={[styles.actionMenuText, { color: colors.status.error }]}>
                    Delete Message
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionMenuItem, styles.actionMenuCancel]}
                  onPress={closeActionMenu}
                >
                  <Text style={[styles.actionMenuText, { color: colors.text.secondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Event Detail Modal */}
      <EventDetailModal
        visible={showEventModal}
        event={eventForModal}
        onClose={() => setShowEventModal(false)}
        onViewProfile={(userId) => {
          setShowEventModal(false);
          navigation.navigate('UserProfile', { userId });
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingBottom: scale(12),
    borderBottomWidth: 1,
  },
  backButton: {
    width: scale(40),
    padding: scale(4),
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: scale(40),
  },
  headerTitle: {
    ...Typography.h4,
    textAlign: 'center',
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(2),
  },
  hostName: {
    ...Typography.caption,
    marginLeft: scale(4),
  },
  pinnedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    gap: scale(10),
  },
  pinnedContent: {
    flex: 1,
  },
  pinnedLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
  pinnedText: {
    ...Typography.body,
    fontSize: fontScale(13),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
  },
  emptyHint: {
    ...Typography.caption,
    marginTop: scale(4),
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: scale(16),
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: scale(8),
  },
  avatar: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: fontScale(14),
    fontWeight: '600',
  },
  messageBubbleWrapper: {
    maxWidth: '75%',
  },
  ownBubbleWrapper: {
    alignItems: 'flex-end',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  senderName: {
    ...Typography.caption,
    fontWeight: '600',
  },
  hostBadge: {
    marginLeft: scale(4),
  },
  messageBubble: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    borderRadius: Spacing.borderRadius.md,
  },
  messageText: {
    ...Typography.body,
  },
  messageTime: {
    ...Typography.caption,
    fontSize: fontScale(10),
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(4),
  },
  ownMessageFooter: {
    justifyContent: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    borderTopWidth: 1,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: Spacing.borderRadius.md,
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    marginRight: scale(10),
    maxHeight: scale(100),
  },
  input: {
    ...Typography.body,
    padding: 0,
    margin: 0,
  },
  sendButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  actionMenu: {
    width: '100%',
    maxWidth: scale(300),
    borderRadius: Spacing.borderRadius.lg,
    overflow: 'hidden',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(16),
    paddingHorizontal: scale(20),
    gap: scale(12),
  },
  actionMenuText: {
    ...Typography.bodyMedium,
  },
  actionMenuCancel: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
    justifyContent: 'center',
  },
  archivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(16),
    paddingTop: scale(14),
    borderTopWidth: 1,
    gap: scale(8),
  },
  archivedText: {
    ...Typography.body,
    fontSize: fontScale(14),
  },
});
