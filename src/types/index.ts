// User types
export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  interests: string[];
  created_at: string;
}

// Event types
export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  date_time: string;
  host_id: string;
  host?: User;
  max_participants: number;
  current_participants: number;
  is_public: boolean;
  created_at: string;
}

// Message types
export interface Message {
  id: string;
  event_id?: string;
  sender_id: string;
  sender?: User;
  content: string;
  created_at: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Interests: undefined;
};

// 5 tabs as per client spec
export type MainTabParamList = {
  Feed: undefined;
  Map: undefined;
  Create: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type FeedStackParamList = {
  FeedHome: undefined;
  EventDetail: { eventId: string };
};

export type ChatStackParamList = {
  ChatList: undefined;
  EventChat: { eventId: string };
  DirectChat: { conversationId: string };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  Settings: undefined;
};
