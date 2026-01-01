// Re-export all database types
export * from './database';

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
  ArchivedChats: undefined;
  EventChat: { eventId: string };
  DirectChat: { conversationId: string };
  UserProfile: { userId: string };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Security: undefined;
  BlockedUsers: undefined;
};
