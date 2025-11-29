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
  Login: undefined;
  Register: undefined;
  Interests: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  Map: undefined;
  CreateEvent: undefined;
  Profile: undefined;
};
