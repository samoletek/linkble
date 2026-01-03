import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, PaperPlaneTilt } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing } from '../../constants';
import { ChatStackParamList, DirectMessageWithSender, Profile } from '../../types';
import { useUserStore } from '../../stores/userStore';
import {
  getDirectMessages,
  sendDirectMessage,
  subscribeToDirectMessages,
  unsubscribe,
  markMessagesAsRead,
} from '../../services/messages';
import { isBlockedByUser } from '../../services/users';
import { supabase } from '../../config/supabase';
import { scale, fontScale, iconScale } from '../../utils/responsive';

type DirectChatRouteProp = RouteProp<ChatStackParamList, 'DirectChat'>;
type NavigationProp = NativeStackNavigationProp<ChatStackParamList>;

export default function DirectChatScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DirectChatRouteProp>();
  const { conversationId } = route.params;

  const currentUser = useUserStore((state) => state.profile);
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<DirectMessageWithSender[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [blockedByOther, setBlockedByOther] = useState(false);

  // Load conversation info and messages
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Load conversation to get other user
      const { data: conversation } = await supabase
        .from('conversations')
        .select('user1_id, user2_id')
        .eq('id', conversationId)
        .single() as { data: { user1_id: string; user2_id: string } | null };

      if (conversation && currentUser) {
        const otherUserId =
          conversation.user1_id === currentUser.id
            ? conversation.user2_id
            : conversation.user1_id;

        const { data: user } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .single();

        if (user) {
          setOtherUser(user as Profile);
        }

        // Check if blocked
        const blocked = await isBlockedByUser(currentUser.id, otherUserId);
        setBlockedByOther(blocked);
      }

      // Load messages
      const directMessages = await getDirectMessages(conversationId);
      setMessages(directMessages);
      setIsLoading(false);

      // Mark messages as read
      await markMessagesAsRead(conversationId);
    };

    loadData();
  }, [conversationId, currentUser]);

  const handleViewProfile = useCallback((userId: string) => {
    if (userId !== currentUser?.id) {
      navigation.navigate('UserProfile', { userId });
    }
  }, [currentUser?.id, navigation]);

  // Subscribe to new messages and read status updates
  useEffect(() => {
    const { mainChannel, broadcastChannel } = subscribeToDirectMessages(
      conversationId,
      async (newMessage) => {
        setMessages((prev) => [...prev, newMessage]);
        // Mark incoming messages as read immediately
        if (newMessage.sender_id !== currentUser?.id) {
          await markMessagesAsRead(conversationId);
        }
      },
      (messageIds) => {
        // Update messages when they are marked as read
        setMessages((prev) =>
          prev.map((msg) =>
            messageIds.includes(msg.id) ? { ...msg, is_read: true } : msg
          )
        );
      }
    );

    return () => {
      unsubscribe(mainChannel);
      unsubscribe(broadcastChannel);
    };
  }, [conversationId, currentUser?.id]);

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

    const { error } = await sendDirectMessage(conversationId, trimmedText);

    if (error) {
      setInputText(trimmedText);
    }

    setIsSending(false);
  }, [conversationId, inputText, isSending]);

  const renderMessage = ({ item }: { item: DirectMessageWithSender }) => {
    const isOwnMessage = item.sender_id === currentUser?.id;
    const senderName = item.sender?.full_name || otherUser?.full_name || 'Unknown';
    const senderAvatar = item.sender?.avatar_url || otherUser?.avatar_url;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isOwnMessage && (
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => otherUser && handleViewProfile(otherUser.id)}
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
      </View>
    );
  };

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
          onPress={() => otherUser && handleViewProfile(otherUser.id)}
          activeOpacity={0.7}
        >
          <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {otherUser?.full_name || 'Loading...'}
          </Text>
        </TouchableOpacity>
        <View style={styles.headerRight} />
      </View>

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
                Start the conversation
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      {blockedByOther ? (
        <View
          style={[
            styles.blockedContainer,
            {
              backgroundColor: colors.background.secondary,
              paddingBottom: insets.bottom || scale(16),
            },
          ]}
        >
          <Text style={[styles.blockedText, { color: colors.text.tertiary }]}>
            You cannot message this user
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
  headerTitle: {
    ...Typography.h4,
    textAlign: 'center',
  },
  headerRight: {
    width: scale(40),
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
  blockedContainer: {
    paddingVertical: scale(16),
    paddingHorizontal: scale(20),
    alignItems: 'center',
  },
  blockedText: {
    ...Typography.body,
  },
});
