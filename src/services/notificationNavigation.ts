import { Alert } from 'react-native';

/**
 * Handles navigation when user taps on a push notification
 * @param data - Notification data payload from OneSignal
 * @param navigation - React Navigation object
 */
export const handleNotificationPress = (data: any, navigation: any) => {
    if (!data || !navigation) return;

    const { type, eventId, conversationId, senderId } = data;

    console.log('🔔 [Notification] Handling click:', type, data);

    switch (type) {
        case 'request_new':
        case 'request_approved':
        case 'request_denied':
            // Navigate to Event Detail screen (in Feed tab)
            if (eventId) {
                navigation.navigate('Main', {
                    screen: 'Feed',
                    params: { eventId }
                });
            }
            break;

        case 'chat_message':
            // Navigate to Event Chat screen (in Chat tab)
            if (eventId) {
                navigation.navigate('Main', {
                    screen: 'Chat',
                    params: {
                        screen: 'EventChat',
                        params: { eventId }
                    }
                });
            }
            break;

        case 'dm_message':
            // Navigate to DM Chat screen (in Chat tab)
            if (conversationId) {
                navigation.navigate('Main', {
                    screen: 'Chat',
                    params: {
                        screen: 'DirectChat',
                        params: { conversationId }
                    }
                });
            }
            break;

        case 'event_cancelled':
            Alert.alert(
                'Event Cancelled',
                'The event you were participating in has been cancelled by the host.',
                [{ text: 'OK' }]
            );
            break;

        case 'kicked':
            Alert.alert(
                'Removed from Event',
                'You have been removed from the event.',
                [{ text: 'OK' }]
            );
            break;

        case 'event_full':
            Alert.alert(
                'Event Full',
                'The event is now full.',
                [{ text: 'OK' }]
            );
            break;

        case 'event_starting':
            // Navigate to Event Detail (in Feed tab)
            if (eventId) {
                navigation.navigate('Main', {
                    screen: 'Feed',
                    params: { eventId }
                });
            }
            break;

        default:
            console.warn('🔔 [Notification] Unknown notification type:', type);
    }
};
