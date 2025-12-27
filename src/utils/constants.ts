// Categories matching database schema
// Note: Actual categories are loaded from Supabase, these are fallback/reference values
export const CATEGORIES = [
  { id: 1, name: 'sports_hobbies', displayName: 'Sports & Hobbies', icon: 'SoccerBall', color: '#34C759' },
  { id: 2, name: 'parties', displayName: 'Parties', icon: 'Wine', color: '#FF2D55' },
  { id: 3, name: 'business', displayName: 'Business', icon: 'Briefcase', color: '#5856D6' },
  { id: 4, name: 'free_time', displayName: 'Free Time', icon: 'Coffee', color: '#FF9500' },
  { id: 5, name: 'studies', displayName: 'Studies', icon: 'GraduationCap', color: '#007AFF' },
  { id: 6, name: 'concerts', displayName: 'Concerts', icon: 'MusicNotes', color: '#AF52DE' },
  { id: 7, name: 'private_events', displayName: 'Private Events', icon: 'LockSimple', color: '#8E8E93' },
];

// Category colors for quick lookup
export const CATEGORY_COLORS: Record<string, string> = {
  sports_hobbies: '#34C759',
  parties: '#FF2D55',
  business: '#5856D6',
  free_time: '#FF9500',
  studies: '#007AFF',
  concerts: '#AF52DE',
  private_events: '#8E8E93',
};

// Category icons mapping (Phosphor icon names)
export const CATEGORY_ICONS: Record<string, string> = {
  sports_hobbies: 'SoccerBall',
  parties: 'Wine',
  business: 'Briefcase',
  free_time: 'Coffee',
  studies: 'GraduationCap',
  concerts: 'MusicNotes',
  private_events: 'LockSimple',
};

// Event settings
export const DEFAULT_RADIUS = 10; // km
export const RADIUS_OPTIONS = [10, 20, 30, 50]; // km

// User settings
export const MAX_INTERESTS = 5;
export const MIN_INTERESTS = 3;
export const MIN_AGE = 16;
export const USERNAME_CHANGE_DAYS = 30;

// Event constraints
export const MIN_PARTICIPANTS = 2;
export const MAX_PARTICIPANTS = 50;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MIN_ADVANCE_HOURS = 1;
export const MAX_ADVANCE_DAYS = 365;
export const HOST_CANCEL_DEADLINE_HOURS = 24;
export const PUBLIC_LEAVE_DEADLINE_HOURS = 1;
export const PRIVATE_LEAVE_DEADLINE_HOURS = 24;
export const CHAT_ARCHIVE_HOURS = 24;

// Message constraints
export const MAX_MESSAGE_LENGTH = 1000;
