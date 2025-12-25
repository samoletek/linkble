import { supabase, getCurrentUserId } from '../config/supabase';
import {
  Message,
  MessageInsert,
  MessageWithSender,
  Conversation,
  ConversationWithUser,
  DirectMessage,
  DirectMessageInsert,
  DirectMessageWithSender,
  Profile,
} from '../types/database';
import { RealtimeChannel } from '@supabase/supabase-js';

// ============================================
// Event Chat Messages
// ============================================

export const getEventMessages = async (
  eventId: string,
  limit: number = 50,
  offset: number = 0
): Promise<MessageWithSender[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles(*)
    `)
    .eq('event_id', eventId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return (data as MessageWithSender[]) || [];
};

export const sendEventMessage = async (
  eventId: string,
  content: string
): Promise<{ message: Message | null; error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { message: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      event_id: eventId,
      user_id: userId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    return { message: null, error: new Error(error.message) };
  }

  return { message: data, error: null };
};

export const pinMessage = async (
  messageId: string,
  pinned: boolean
): Promise<{ error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: new Error('Not authenticated') };
  }

  // Get message and verify host permission
  const { data: message } = await supabase
    .from('messages')
    .select(`
      event_id,
      event:events(host_id)
    `)
    .eq('id', messageId)
    .single();

  if (!message || (message.event as any)?.host_id !== userId) {
    return { error: new Error('Not authorized to pin messages') };
  }

  const { error } = await supabase
    .from('messages')
    .update({ is_pinned: pinned })
    .eq('id', messageId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
};

export const deleteMessage = async (
  messageId: string
): Promise<{ error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: new Error('Not authenticated') };
  }

  // Get message and check permissions (own message or host)
  const { data: message } = await supabase
    .from('messages')
    .select(`
      user_id,
      event_id,
      event:events(host_id)
    `)
    .eq('id', messageId)
    .single();

  if (!message) {
    return { error: new Error('Message not found') };
  }

  const isOwner = message.user_id === userId;
  const isHost = (message.event as any)?.host_id === userId;

  if (!isOwner && !isHost) {
    return { error: new Error('Not authorized to delete this message') };
  }

  const { error } = await supabase
    .from('messages')
    .update({ is_deleted: true })
    .eq('id', messageId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
};

// ============================================
// Direct Messages
// ============================================

export const getConversations = async (): Promise<ConversationWithUser[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }

  // Fetch other user details and last message for each conversation
  const conversationsWithDetails = await Promise.all(
    (data || []).map(async (conv) => {
      const otherUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;

      const [{ data: otherUser }, { data: lastMessage }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', otherUserId).single(),
        supabase
          .from('direct_messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
      ]);

      return {
        ...conv,
        other_user: otherUser as Profile,
        last_message: lastMessage as DirectMessage | null,
      };
    })
  );

  return conversationsWithDetails;
};

export const getOrCreateConversation = async (
  otherUserId: string
): Promise<{ conversationId: string | null; error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { conversationId: null, error: new Error('Not authenticated') };
  }

  if (userId === otherUserId) {
    return { conversationId: null, error: new Error('Cannot create conversation with yourself') };
  }

  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_user1_id: userId,
    p_user2_id: otherUserId,
  });

  if (error) {
    return { conversationId: null, error: new Error(error.message) };
  }

  return { conversationId: data, error: null };
};

export const getDirectMessages = async (
  conversationId: string,
  limit: number = 50,
  offset: number = 0
): Promise<DirectMessageWithSender[]> => {
  const { data, error } = await supabase
    .from('direct_messages')
    .select(`
      *,
      sender:profiles(*)
    `)
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching direct messages:', error);
    return [];
  }

  return (data as DirectMessageWithSender[]) || [];
};

export const sendDirectMessage = async (
  conversationId: string,
  content: string
): Promise<{ message: DirectMessage | null; error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { message: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    return { message: null, error: new Error(error.message) };
  }

  return { message: data, error: null };
};

export const deleteDirectMessage = async (
  messageId: string
): Promise<{ error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: new Error('Not authenticated') };
  }

  // Verify ownership
  const { data: message } = await supabase
    .from('direct_messages')
    .select('sender_id')
    .eq('id', messageId)
    .single();

  if (!message || message.sender_id !== userId) {
    return { error: new Error('Not authorized to delete this message') };
  }

  const { error } = await supabase
    .from('direct_messages')
    .update({ is_deleted: true })
    .eq('id', messageId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
};

// ============================================
// Real-time Subscriptions
// ============================================

export const subscribeToEventMessages = (
  eventId: string,
  onMessage: (message: MessageWithSender) => void
): RealtimeChannel => {
  return supabase
    .channel(`event_chat:${eventId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `event_id=eq.${eventId}`,
      },
      async (payload) => {
        // Fetch sender details
        const { data: sender } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', payload.new.user_id)
          .single();

        onMessage({
          ...payload.new,
          sender,
        } as MessageWithSender);
      }
    )
    .subscribe();
};

export const subscribeToDirectMessages = (
  conversationId: string,
  onMessage: (message: DirectMessageWithSender) => void
): RealtimeChannel => {
  return supabase
    .channel(`dm:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        // Fetch sender details
        const { data: sender } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', payload.new.sender_id)
          .single();

        onMessage({
          ...payload.new,
          sender,
        } as DirectMessageWithSender);
      }
    )
    .subscribe();
};

export const subscribeToConversations = (
  onUpdate: () => void
): RealtimeChannel => {
  return supabase
    .channel('conversations_updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();
};

export const unsubscribe = (channel: RealtimeChannel): void => {
  supabase.removeChannel(channel);
};
