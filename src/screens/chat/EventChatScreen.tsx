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
import { ArrowLeft, PaperPlaneTilt, Crown } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing } from '../../constants';
import { ChatStackParamList, MessageWithSender } from '../../types';
import { useUserStore } from '../../stores/userStore';
import {
  getEventMessages,
  sendEventMessage,
  subscribeToEventMessages,
  unsubscribe,
} from '../../services/messages';
import { supabase } from '../../config/supabase';

type EventChatRouteProp = RouteProp<ChatStackParamList, 'EventChat'>;
type NavigationProp = NativeStackNavigationProp<ChatStackParamList>;

interface EventInfo {
  id: string;
  title: string;
  host_id: string;
  host: {
    full_name: string;
    avatar_url: string | null;
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

  // Load event info and messages
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Load event info
      const { data: event } = await supabase
        .from('events')
        .select(`
          id,
          title,
          host_id,
          host:profiles!events_host_id_fkey(full_name, avatar_url)
        `)
        .eq('id', eventId)
        .single();

      if (event) {
        setEventInfo(event as unknown as EventInfo);
      }

      // Load messages
      const eventMessages = await getEventMessages(eventId);
      setMessages(eventMessages);
      setIsLoading(false);
    };

    loadData();
  }, [eventId]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = subscribeToEventMessages(eventId, (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    return () => {
      unsubscribe(channel);
    };
  }, [eventId]);

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

  const renderMessage = ({ item }: { item: MessageWithSender }) => {
    const isOwnMessage = item.user_id === currentUser?.id;
    const isHostMessage = item.user_id === eventInfo?.host_id;
    const senderName = item.sender?.full_name || 'Unknown';
    const senderAvatar = item.sender?.avatar_url;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isOwnMessage && (
          <View style={styles.avatarContainer}>
            {senderAvatar ? (
              <Image source={{ uri: senderAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.accent.primary }]}>
                <Text style={styles.avatarInitial}>
                  {senderName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}
        <View style={[styles.messageBubbleWrapper, isOwnMessage && styles.ownBubbleWrapper]}>
          {!isOwnMessage && (
            <View style={styles.senderInfo}>
              <Text style={[styles.senderName, { color: colors.text.secondary }]}>
                {senderName}
              </Text>
              {isHostMessage && (
                <Crown size={12} color={colors.accent.primary} weight="fill" style={styles.hostBadge} />
              )}
            </View>
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
          <Text style={[styles.messageTime, { color: colors.text.tertiary }]}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
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
          <ArrowLeft size={24} color={colors.text.primary} weight="bold" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {eventInfo?.title || 'Event Chat'}
          </Text>
          {eventInfo?.host && (
            <View style={styles.hostInfo}>
              <Crown size={12} color={colors.accent.primary} weight="fill" />
              <Text style={[styles.hostName, { color: colors.text.secondary }]}>
                {eventInfo.host.full_name}
              </Text>
            </View>
          )}
        </View>
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
                Be the first to say something
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.background.primary,
            borderTopColor: colors.border.primary,
            paddingBottom: insets.bottom || 16,
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
              size={20}
              color={inputText.trim() ? '#FFFFFF' : colors.text.tertiary}
              weight="fill"
            />
          )}
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h4,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  hostName: {
    ...Typography.caption,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    marginTop: 4,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 14,
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
    marginBottom: 4,
  },
  senderName: {
    ...Typography.caption,
    fontWeight: '600',
  },
  hostBadge: {
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Spacing.borderRadius.md,
  },
  messageText: {
    ...Typography.body,
  },
  messageTime: {
    ...Typography.caption,
    fontSize: 10,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: Spacing.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  input: {
    ...Typography.body,
    padding: 0,
    margin: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
