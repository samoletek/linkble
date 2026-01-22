// Database types for Supabase
// Auto-generated based on schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================
// Table Types
// ============================================

export interface Category {
  id: number;
  name: string;
  display_name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string | null;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  date_of_birth: string;
  interests: number[];
  push_token: string | null;
  notification_settings: Json | null;
  created_at: string;
  updated_at: string;
  last_username_change: string | null;
}

export interface Event {
  id: string;
  host_id: string;
  title: string;
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
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'left' | 'kicked';
  requested_at: string;
  responded_at: string | null;
}

export interface Message {
  id: string;
  event_id: string;
  user_id: string | null;
  content: string;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  created_at: string;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  is_pinned: boolean;
  is_deleted: boolean;
  is_read: boolean;
  created_at: string;
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface MessageRead {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface Report {
  id: string;
  reporter_id: string | null;
  reported_user_id: string | null;
  reported_event_id: string | null;
  reason: ReportReason;
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
}

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate_content'
  | 'fake_profile'
  | 'scam'
  | 'underage'
  | 'violence'
  | 'other';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Json;
  is_read: boolean;
  created_at: string;
}

export type NotificationType =
  | 'join_request'
  | 'request_accepted'
  | 'request_rejected'
  | 'new_message'
  | 'new_dm'
  | 'event_nearby'
  | 'event_cancelled'
  | 'event_starting_1h'
  | 'event_starting_30m'
  | 'event_started'
  | 'kicked_from_event'
  | 'event_full';

// ============================================
// Extended Types (with relations)
// ============================================

export interface EventWithHost extends Event {
  host: Profile;
  category: Category;
}

export interface EventWithDetails extends EventWithHost {
  participants_count: number;
  is_participant: boolean;
  participant_status: EventParticipant['status'] | null;
}

export interface MessageWithSender extends Message {
  sender: Profile | null;
  is_read_by_others?: boolean;
}

export interface DirectMessageWithSender extends DirectMessage {
  sender: Profile | null;
}

export interface ConversationWithUser extends Conversation {
  other_user: Profile;
  last_message: DirectMessage | null;
  unread_count: number;
}

// ============================================
// Insert Types (for creating new records)
// ============================================

export interface ProfileInsert {
  id: string;
  full_name: string;
  date_of_birth?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  interests?: number[];
  push_token?: string;
}

export interface ProfileUpdate {
  username?: string;
  full_name?: string;
  avatar_url?: string | null;
  bio?: string;
  interests?: number[];
  push_token?: string;
  last_username_change?: string;
}

export interface EventInsert {
  host_id: string;
  title: string;
  description: string;
  category_id: number;
  location_lat: number;
  location_lng: number;
  location_address: string;
  start_time: string;
  end_time?: string;
  max_participants?: number;
  is_private?: boolean;
  auto_accept?: boolean;
  image_url?: string;
}

export interface EventUpdate {
  title?: string;
  description?: string;
  category_id?: number;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  start_time?: string;
  end_time?: string;
  max_participants?: number;
  is_private?: boolean;
  auto_accept?: boolean;
  image_url?: string;
  status?: Event['status'];
}

export interface MessageInsert {
  event_id: string;
  user_id: string;
  content: string;
}

export interface DirectMessageInsert {
  conversation_id: string;
  sender_id: string;
  content: string;
}

export interface ReportInsert {
  reporter_id: string;
  reported_user_id?: string;
  reported_event_id?: string;
  reason: ReportReason;
  description?: string;
}

// ============================================
// Database Schema Type (for Supabase client)
// ============================================

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: never; // Read-only
        Update: never;
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      events: {
        Row: Event;
        Insert: EventInsert;
        Update: EventUpdate;
      };
      event_participants: {
        Row: EventParticipant;
        Insert: Omit<EventParticipant, 'id' | 'requested_at' | 'responded_at'>;
        Update: Partial<Pick<EventParticipant, 'status' | 'responded_at'>>;
      };
      messages: {
        Row: Message;
        Insert: MessageInsert;
        Update: Partial<Pick<Message, 'is_pinned' | 'is_deleted'>>;
      };
      conversations: {
        Row: Conversation;
        Insert: Pick<Conversation, 'user1_id' | 'user2_id'>;
        Update: never;
      };
      direct_messages: {
        Row: DirectMessage;
        Insert: DirectMessageInsert;
        Update: Partial<Pick<DirectMessage, 'is_pinned' | 'is_deleted' | 'is_read'>>;
      };
      blocked_users: {
        Row: BlockedUser;
        Insert: Pick<BlockedUser, 'blocker_id' | 'blocked_id'>;
        Update: never;
      };
      reports: {
        Row: Report;
        Insert: ReportInsert;
        Update: never;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Pick<Notification, 'is_read'>>;
      };
      message_reads: {
        Row: MessageRead;
        Insert: Pick<MessageRead, 'message_id' | 'user_id'>;
        Update: never;
      };
    };
    Functions: {
      get_nearby_events: {
        Args: {
          user_lat: number;
          user_lng: number;
          radius_km?: number;
        };
        Returns: Event[];
      };
      can_join_event: {
        Args: {
          p_user_id: string;
          p_event_id: string;
        };
        Returns: {
          can_join: boolean;
          reason?: string;
          auto_accept?: boolean;
        };
      };
      get_or_create_conversation: {
        Args: {
          p_user1_id: string;
          p_user2_id: string;
        };
        Returns: string;
      };
    };
  };
}
