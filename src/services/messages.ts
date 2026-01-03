import { supabase, getCurrentUserId } from '../config/supabase';
import {
  Message,
  MessageWithSender,
  Conversation,
  ConversationWithUser,
  DirectMessage,
  DirectMessageWithSender,
  Profile,
} from '../types/database';
import { RealtimeChannel } from '@supabase/supabase-js';

// ============================================
// Event Chats List
// ============================================

export interface EventChatPreview {
  event_id: string;
  event_title: string;
  event_image: string | null;
  host_name: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface EventWithHost {
  id: string;
  title: string;
  image_url: string | null;
  host_id: string;
  host: { full_name: string } | null;
}

interface EventWithHostAndDate extends EventWithHost {
  start_time: string;
}

export const getEventChats = async (): Promise<EventChatPreview[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const now = new Date().toISOString();

  // Get events where user is accepted participant or host (only future/ongoing events)
  const { data: participations, error: participationsError } = await supabase
    .from('event_participants')
    .select(`
      event_id,
      event:events(
        id,
        title,
        image_url,
        host_id,
        start_time,
        host:profiles!events_host_id_fkey(full_name)
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'accepted') as { data: Array<{ event_id: string; event: EventWithHostAndDate | null }> | null; error: any };

  // Get events where user is host (active events - no date filter since host controls status)
  const { data: hostedEvents, error: hostedError } = await supabase
    .from('events')
    .select(`
      id,
      title,
      image_url,
      host_id,
      start_time,
      host:profiles!events_host_id_fkey(full_name)
    `)
    .eq('host_id', userId)
    .eq('status', 'active') as { data: EventWithHostAndDate[] | null; error: any };

  if (participationsError || hostedError) {
    console.error('Error fetching event chats:', participationsError || hostedError);
    return [];
  }

  // Combine events (filter to only future/ongoing events)
  const eventMap = new Map<string, EventWithHost>();

  // Add hosted events (already filtered by gte event_date)
  (hostedEvents || []).forEach((event) => {
    eventMap.set(event.id, event);
  });

  // Add participated events (filter future events only)
  (participations || []).forEach((p) => {
    if (p.event && !eventMap.has(p.event.id) && new Date(p.event.start_time) >= new Date(now)) {
      eventMap.set(p.event.id, p.event);
    }
  });

  // Get last message for each event
  const chats = await Promise.all(
    Array.from(eventMap.values()).map(async (event) => {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('event_id', event.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single() as { data: { content: string; created_at: string } | null };

      // Get all messages in this event (not from current user, not deleted)
      const { data: allMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('event_id', event.id)
        .eq('is_deleted', false)
        .neq('user_id', userId) as { data: Array<{ id: string }> | null };

      let unreadCount = 0;
      if (allMessages && allMessages.length > 0) {
        // Get messages already read by current user
        const { data: readMessages } = await supabase
          .from('message_reads')
          .select('message_id')
          .eq('user_id', userId)
          .in('message_id', allMessages.map(m => m.id)) as { data: Array<{ message_id: string }> | null };

        const readIds = new Set((readMessages || []).map(r => r.message_id));
        unreadCount = allMessages.filter(m => !readIds.has(m.id)).length;
      }

      return {
        event_id: event.id,
        event_title: event.title,
        event_image: event.image_url,
        host_name: event.host?.full_name || 'Unknown',
        last_message: lastMsg?.content || null,
        last_message_at: lastMsg?.created_at || null,
        unread_count: unreadCount,
      };
    })
  );

  // Sort by last message time
  return chats.sort((a, b) => {
    if (!a.last_message_at) return 1;
    if (!b.last_message_at) return -1;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });
};

// ============================================
// Archived Event Chats (ended within 24 hours)
// ============================================

export interface ArchivedEventChatPreview extends EventChatPreview {
  start_time: string;
  ended_at: Date;
}

export const getArchivedEventChats = async (): Promise<ArchivedEventChatPreview[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get events where user participated and event has ended (within last 24 hours)
  const { data: participations, error: participationsError } = await supabase
    .from('event_participants')
    .select(`
      event_id,
      event:events(
        id,
        title,
        image_url,
        host_id,
        start_time,
        host:profiles!events_host_id_fkey(full_name)
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'accepted') as { data: Array<{ event_id: string; event: EventWithHostAndDate | null }> | null; error: any };

  // Get events where user is host (ended within 24 hours)
  const { data: hostedEvents, error: hostedError } = await supabase
    .from('events')
    .select(`
      id,
      title,
      image_url,
      host_id,
      start_time,
      host:profiles!events_host_id_fkey(full_name)
    `)
    .eq('host_id', userId)
    .lt('start_time', now.toISOString())
    .gte('start_time', twentyFourHoursAgo.toISOString()) as { data: EventWithHostAndDate[] | null; error: any };

  if (participationsError || hostedError) {
    console.error('Error fetching archived event chats:', participationsError || hostedError);
    return [];
  }

  // Combine events (filter to only ended events within 24 hours)
  const eventMap = new Map<string, EventWithHostAndDate>();

  // Add hosted events (already filtered)
  (hostedEvents || []).forEach((event) => {
    eventMap.set(event.id, event);
  });

  // Add participated events (filter ended within 24 hours)
  (participations || []).forEach((p) => {
    if (p.event && !eventMap.has(p.event.id)) {
      const eventDate = new Date(p.event.start_time);
      if (eventDate < now && eventDate >= twentyFourHoursAgo) {
        eventMap.set(p.event.id, p.event);
      }
    }
  });

  // Get last message for each event
  const chats = await Promise.all(
    Array.from(eventMap.values()).map(async (event) => {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('event_id', event.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single() as { data: { content: string; created_at: string } | null };

      // Get all messages in this event (not from current user, not deleted)
      const { data: allMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('event_id', event.id)
        .eq('is_deleted', false)
        .neq('user_id', userId) as { data: Array<{ id: string }> | null };

      let unreadCount = 0;
      if (allMessages && allMessages.length > 0) {
        // Get messages already read by current user
        const { data: readMessages } = await supabase
          .from('message_reads')
          .select('message_id')
          .eq('user_id', userId)
          .in('message_id', allMessages.map(m => m.id)) as { data: Array<{ message_id: string }> | null };

        const readIds = new Set((readMessages || []).map(r => r.message_id));
        unreadCount = allMessages.filter(m => !readIds.has(m.id)).length;
      }

      return {
        event_id: event.id,
        event_title: event.title,
        event_image: event.image_url,
        host_name: event.host?.full_name || 'Unknown',
        last_message: lastMsg?.content || null,
        last_message_at: lastMsg?.created_at || null,
        unread_count: unreadCount,
        start_time: event.start_time,
        ended_at: new Date(event.start_time),
      };
    })
  );

  // Sort by event end date (most recent first)
  return chats.sort((a, b) => b.ended_at.getTime() - a.ended_at.getTime());
};

export const getArchivedChatsCount = async (): Promise<number> => {
  const chats = await getArchivedEventChats();
  return chats.length;
};

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

  const { data, error } = await (supabase
    .from('messages') as any)
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

  return { message: data as Message, error: null };
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
    .single() as { data: { event_id: string; event: { host_id: string } | null } | null };

  if (!message || message.event?.host_id !== userId) {
    return { error: new Error('Not authorized to pin messages') };
  }

  const { error } = await (supabase
    .from('messages') as any)
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
    .single() as { data: { user_id: string | null; event_id: string; event: { host_id: string } | null } | null };

  if (!message) {
    return { error: new Error('Message not found') };
  }

  const isOwner = message.user_id === userId;
  const isHost = message.event?.host_id === userId;

  if (!isOwner && !isHost) {
    return { error: new Error('Not authorized to delete this message') };
  }

  const { error } = await (supabase
    .from('messages') as any)
    .update({ is_deleted: true })
    .eq('id', messageId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
};

// ============================================
// Event Message Read Tracking
// ============================================

export const markEventMessagesAsRead = async (
  eventId: string
): Promise<{ error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: new Error('Not authenticated') };
  }

  // Get all unread messages in this event (not sent by current user)
  const { data: unreadMessages, error: fetchError } = await supabase
    .from('messages')
    .select('id')
    .eq('event_id', eventId)
    .eq('is_deleted', false)
    .neq('user_id', userId) as { data: Array<{ id: string }> | null; error: any };

  if (fetchError || !unreadMessages?.length) {
    return { error: fetchError ? new Error(fetchError.message) : null };
  }

  // Get messages already read by this user
  const { data: alreadyRead } = await supabase
    .from('message_reads')
    .select('message_id')
    .eq('user_id', userId)
    .in('message_id', unreadMessages.map(m => m.id)) as { data: Array<{ message_id: string }> | null };

  const alreadyReadIds = new Set((alreadyRead || []).map(r => r.message_id));
  const toInsert = unreadMessages
    .filter(m => !alreadyReadIds.has(m.id))
    .map(m => ({ message_id: m.id, user_id: userId }));

  if (toInsert.length === 0) {
    return { error: null };
  }

  const { error } = await (supabase
    .from('message_reads') as any)
    .insert(toInsert);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
};

export const getMessageReadStatus = async (
  messageIds: string[],
  senderId: string
): Promise<Set<string>> => {
  if (!messageIds.length) return new Set();

  const { data, error } = await supabase
    .from('message_reads')
    .select('message_id')
    .in('message_id', messageIds)
    .neq('user_id', senderId) as { data: Array<{ message_id: string }> | null; error: any };

  if (error) {
    console.error('Error fetching read status:', error);
    return new Set();
  }

  return new Set((data || []).map(r => r.message_id));
};

// ============================================
// Direct Messages
// ============================================

export const getConversations = async (): Promise<ConversationWithUser[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  // Get hidden conversation IDs
  const hiddenIds = await getHiddenConversationIds();

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false }) as { data: Conversation[] | null; error: any };

  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }

  // Filter out hidden conversations
  const visibleConversations = (data || []).filter(conv => !hiddenIds.includes(conv.id));

  // Fetch other user details, last message, and unread count for each conversation
  const conversationsWithDetails = await Promise.all(
    visibleConversations.map(async (conv) => {
      const otherUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;

      const { data: otherUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single() as { data: Profile | null };

      const { data: lastMessage } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single() as { data: DirectMessage | null };

      const { count: unreadCount } = await (supabase
        .from('direct_messages') as any)
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('is_deleted', false)
        .eq('is_read', false)
        .neq('sender_id', userId);

      return {
        ...conv,
        other_user: (otherUser || {}) as Profile,
        last_message: lastMessage,
        unread_count: unreadCount || 0,
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

  const { data, error } = await (supabase.rpc as any)('get_or_create_conversation', {
    p_user1_id: userId,
    p_user2_id: otherUserId,
  });

  if (error) {
    return { conversationId: null, error: new Error(error.message) };
  }

  return { conversationId: data as string, error: null };
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

  const { data, error } = await (supabase
    .from('direct_messages') as any)
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

  return { message: data as DirectMessage, error: null };
};

export const markMessagesAsRead = async (
  conversationId: string
): Promise<{ error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: new Error('Not authenticated') };
  }

  // Get unread message IDs before updating
  const { data: unreadMessages } = await supabase
    .from('direct_messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('is_read', false)
    .neq('sender_id', userId) as { data: Array<{ id: string }> | null };

  if (!unreadMessages || unreadMessages.length === 0) {
    return { error: null };
  }

  const messageIds = unreadMessages.map(m => m.id);

  const { error } = await (supabase
    .from('direct_messages') as any)
    .update({ is_read: true })
    .in('id', messageIds);

  if (error) {
    return { error: new Error(error.message) };
  }

  // Broadcast read status - need to subscribe first, then send
  return new Promise((resolve) => {
    const broadcastChannel = supabase.channel(`dm-broadcast:${conversationId}`);
    broadcastChannel
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          broadcastChannel.send({
            type: 'broadcast',
            event: 'messages_read',
            payload: { messageIds, readBy: userId },
          }).then(() => {
            supabase.removeChannel(broadcastChannel);
            resolve({ error: null });
          });
        }
      });
  });
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
    .single() as { data: { sender_id: string | null } | null };

  if (!message || message.sender_id !== userId) {
    return { error: new Error('Not authorized to delete this message') };
  }

  const { error } = await (supabase
    .from('direct_messages') as any)
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
  onMessage: (message: MessageWithSender) => void,
  onMessageRead?: (messageId: string) => void
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
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message_reads',
      },
      async (payload) => {
        if (onMessageRead) {
          onMessageRead(payload.new.message_id);
        }
      }
    )
    .subscribe();
};

export const subscribeToDirectMessages = (
  conversationId: string,
  onMessage: (message: DirectMessageWithSender) => void,
  onMessagesRead?: (messageIds: string[]) => void
): { mainChannel: RealtimeChannel; broadcastChannel: RealtimeChannel } => {
  const mainChannel = supabase
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

  // Separate channel for broadcast (read receipts)
  const broadcastChannel = supabase
    .channel(`dm-broadcast:${conversationId}`)
    .on(
      'broadcast',
      { event: 'messages_read' },
      (payload) => {
        if (onMessagesRead && payload.payload?.messageIds) {
          onMessagesRead(payload.payload.messageIds as string[]);
        }
      }
    )
    .subscribe();

  return { mainChannel, broadcastChannel };
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

export const subscribeToChatListUpdates = (
  onUpdate: () => void
): { messagesChannel: RealtimeChannel; directMessagesChannel: RealtimeChannel } => {
  const messagesChannel = supabase
    .channel('chat_list_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  const directMessagesChannel = supabase
    .channel('chat_list_direct_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return { messagesChannel, directMessagesChannel };
};

export const unsubscribe = (channel: RealtimeChannel): void => {
  supabase.removeChannel(channel);
};

// ============================================
// Chat Deletion (Hide for User)
// ============================================

/**
 * Leave an event chat - removes the user from the event
 * This will hide the chat from the user's list since they're no longer a participant
 */
export const leaveEventChat = async (
  eventId: string
): Promise<{ error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: new Error('Not authenticated') };
  }

  // Check if user is the host - hosts cannot leave their own event
  const { data: event } = await supabase
    .from('events')
    .select('host_id')
    .eq('id', eventId)
    .single() as { data: { host_id: string } | null };

  if (event?.host_id === userId) {
    return { error: new Error('As the host, you cannot leave your own event. Cancel the event instead.') };
  }

  // Update participant status to 'left'
  const { error } = await (supabase
    .from('event_participants') as any)
    .update({ status: 'left' })
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
};

/**
 * Hide a direct conversation for the current user
 * Stores in hidden_conversations table in Supabase
 */
export const hideConversation = async (
  conversationId: string
): Promise<{ error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: new Error('Not authenticated') };
  }

  const { error } = await (supabase
    .from('hidden_conversations') as any)
    .insert({
      user_id: userId,
      conversation_id: conversationId,
    });

  if (error) {
    // Ignore unique constraint violation (already hidden)
    if (error.code === '23505') {
      return { error: null };
    }
    return { error: new Error(error.message) };
  }

  return { error: null };
};

/**
 * Get list of hidden conversation IDs for current user
 */
export const getHiddenConversationIds = async (): Promise<string[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('hidden_conversations')
    .select('conversation_id')
    .eq('user_id', userId) as { data: Array<{ conversation_id: string }> | null; error: any };

  if (error) {
    console.error('Error fetching hidden conversations:', error);
    return [];
  }

  return (data || []).map(item => item.conversation_id);
};
