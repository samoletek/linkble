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
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, PaperPlaneTilt, DotsThreeVertical, Prohibit } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing } from '../../constants';
import { ChatStackParamList, DirectMessageWithSender, Profile } from '../../types';
import { useUserStore } from '../../stores/userStore';
import {
  getDirectMessages,
  sendDirectMessage,
  subscribeToDirectMessages,
  unsubscribe,
} from '../../services/messages';
import { blockUser, isBlockedByUser } from '../../services/users';
import { supabase } from '../../config/supabase';

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
  const [showMenu, setShowMenu] = useState(false);
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
        .single();

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
    };

    loadData();
  }, [conversationId, currentUser]);

  const handleBlock = useCallback(() => {
    if (!currentUser || !otherUser) return;

    Alert.alert(
      'Block User',
      `Are you sure you want to block ${otherUser.full_name}? They won't be able to message you or view your profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(currentUser.id, otherUser.id);
              setShowMenu(false);
              Alert.alert('User Blocked', `${otherUser.full_name} has been blocked.`);
              navigation.goBack();
            } catch (error) {
              console.error('Failed to block user:', error);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          },
        },
      ]
    );
  }, [currentUser, otherUser, navigation]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = subscribeToDirectMessages(conversationId, (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    return () => {
      unsubscribe(channel);
    };
  }, [conversationId]);

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
          {otherUser?.avatar_url ? (
            <Image source={{ uri: otherUser.avatar_url }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.avatarPlaceholder, { backgroundColor: colors.accent.primary }]}>
              <Text style={styles.headerAvatarInitial}>
                {otherUser?.full_name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {otherUser?.full_name || 'Loading...'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton}>
          <DotsThreeVertical size={24} color={colors.text.primary} weight="bold" />
        </TouchableOpacity>
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
              paddingBottom: insets.bottom || 16,
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
      )}

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View
            style={[styles.menuContent, { backgroundColor: colors.background.secondary }]}
            onStartShouldSetResponder={() => true}
          >
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border.primary }]}
              onPress={() => {
                setShowMenu(false);
                handleBlock();
              }}
              activeOpacity={0.7}
            >
              <Prohibit size={20} color={colors.status.error} weight="regular" />
              <Text style={[styles.menuItemText, { color: colors.status.error }]}>
                Block User
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    ...Typography.h4,
    flex: 1,
  },
  menuButton: {
    padding: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContent: {
    width: '80%',
    maxWidth: 300,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  menuItemText: {
    ...Typography.body,
    fontWeight: '500',
  },
  blockedContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  blockedText: {
    ...Typography.body,
  },
});
