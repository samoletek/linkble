interface MockEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  latitude: number;
  longitude: number;
  hostName: string;
  hostAvatar: string;
  image: string;
  spotsTotal: number;
  spotsTaken: number;
}

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: '1',
    title: 'Morning Run in Central Park',
    description: 'Join us for a refreshing 5K morning run through Central Park. All fitness levels welcome. We will meet at the fountain near the entrance.',
    category: 'Sports',
    date: 'Dec 28, 2025',
    time: '7:00 AM',
    location: 'Central Park, New York',
    latitude: 40.7829,
    longitude: -73.9654,
    hostName: 'Alex',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    image: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&h=400&fit=crop',
    spotsTotal: 10,
    spotsTaken: 6,
  },
  {
    id: '2',
    title: 'New Year Eve Party',
    description: 'Celebrate the new year with great music, drinks, and amazing people. Dress code: smart casual. Bring your positive vibes!',
    category: 'Parties',
    date: 'Dec 31, 2025',
    time: '9:00 PM',
    location: 'Rooftop Bar, Downtown',
    latitude: 40.7128,
    longitude: -74.0060,
    hostName: 'Maria',
    hostAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop',
    spotsTotal: 30,
    spotsTaken: 24,
  },
  {
    id: '3',
    title: 'Startup Networking Breakfast',
    description: 'Connect with fellow entrepreneurs and investors over coffee. Share ideas, find co-founders, and expand your network.',
    category: 'Business',
    date: 'Jan 3, 2026',
    time: '8:30 AM',
    location: 'WeWork, 5th Avenue',
    latitude: 40.7484,
    longitude: -73.9857,
    hostName: 'David',
    hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=400&fit=crop',
    spotsTotal: 20,
    spotsTaken: 12,
  },
  {
    id: '4',
    title: 'Board Games Night',
    description: 'Bring your favorite games or try something new. We have Catan, Ticket to Ride, and many more. Snacks provided!',
    category: 'Free Time',
    date: 'Dec 29, 2025',
    time: '6:00 PM',
    location: 'The Game Cafe, Brooklyn',
    latitude: 40.6782,
    longitude: -73.9442,
    hostName: 'Sophie',
    hostAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400&h=400&fit=crop',
    spotsTotal: 8,
    spotsTaken: 3,
  },
  {
    id: '5',
    title: 'JavaScript Study Group',
    description: 'Weekly meetup to practice coding together. This week: async/await and promises. Laptops required.',
    category: 'Studies',
    date: 'Jan 2, 2026',
    time: '5:00 PM',
    location: 'Public Library, Main Branch',
    latitude: 40.7532,
    longitude: -73.9822,
    hostName: 'Mike',
    hostAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop',
    spotsTotal: 12,
    spotsTaken: 8,
  },
  {
    id: '6',
    title: 'Jazz Night Live',
    description: 'Local jazz band performing classic standards. Great venue with intimate atmosphere. Doors open at 7 PM.',
    category: 'Concerts',
    date: 'Jan 5, 2026',
    time: '8:00 PM',
    location: 'Blue Note Jazz Club',
    latitude: 40.7308,
    longitude: -74.0005,
    hostName: 'Chris',
    hostAvatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop&crop=face',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=400&fit=crop',
    spotsTotal: 15,
    spotsTaken: 11,
  },
  {
    id: '7',
    title: 'Birthday Dinner',
    description: 'Celebrating my 25th birthday with close friends. Italian restaurant, good wine, great company. Invite only.',
    category: 'Private',
    date: 'Jan 10, 2026',
    time: '7:30 PM',
    location: 'Trattoria Roma, Manhattan',
    latitude: 40.7614,
    longitude: -73.9776,
    hostName: 'Emma',
    hostAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=400&fit=crop',
    spotsTotal: 12,
    spotsTaken: 9,
  },
];

// Default map region (New York City)
export const DEFAULT_REGION = {
  latitude: 40.7484,
  longitude: -73.9857,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

// Category colors for map markers
export const CATEGORY_COLORS: Record<string, string> = {
  'Sports': '#34C759',
  'Parties': '#FF2D55',
  'Business': '#5856D6',
  'Free Time': '#FF9500',
  'Studies': '#007AFF',
  'Concerts': '#AF52DE',
  'Private': '#8E8E93',
};
