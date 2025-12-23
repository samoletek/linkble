import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import EventCard, { Event } from '../../components/events/EventCard';
import EventDetailModal from '../../components/events/EventDetailModal';

const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Morning Run in Central Park',
    description: 'Join us for a refreshing 5K morning run through Central Park. All fitness levels welcome. We will meet at the fountain near the entrance.',
    category: 'Sports',
    date: 'Dec 28, 2025',
    time: '7:00 AM',
    location: 'Central Park, New York',
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
    hostName: 'Emma',
    hostAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=400&fit=crop',
    spotsTotal: 12,
    spotsTaken: 9,
  },
];

const HEADER_MAX_HEIGHT = 52;
const HEADER_MIN_HEIGHT = 40;
const TITLE_MAX_SIZE = 32;
const TITLE_MIN_SIZE = 20;

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const titleSize = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [TITLE_MAX_SIZE, TITLE_MIN_SIZE],
    extrapolate: 'clamp',
  });


  const renderItem = ({ item }: { item: Event }) => (
    <EventCard event={item} onPress={handleEventPress} />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top }]}>
      <Animated.View
        style={[
          styles.header,
          {
            height: headerHeight,
          }
        ]}
      >
        <Animated.Text
          style={[
            styles.title,
            {
              color: colors.text.primary,
              fontSize: titleSize,
            }
          ]}
        >
          Events
        </Animated.Text>
      </Animated.View>

      <Animated.FlatList
        data={MOCK_EVENTS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />

      <EventDetailModal
        visible={modalVisible}
        event={selectedEvent}
        onClose={handleCloseModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  title: {
    fontWeight: '700',
    lineHeight: 38,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
});
