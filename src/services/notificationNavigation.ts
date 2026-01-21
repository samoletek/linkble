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
            // Navigate to Event Detail screen
            if (eventId) {
                navigation.navigate('EventDetail', { eventId });
            }
            break;

        case 'chat_message':
            // Navigate to Event Chat screen
            if (eventId) {
                navigation.navigate('EventChat', { eventId });
            }
            break;

        case 'dm_message':
            // Navigate to DM Chat screen
            if (conversationId) {
                navigation.navigate('Chat', { conversationId });
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
            // Navigate to Event Detail
            if (eventId) {
                navigation.navigate('EventDetail', { eventId });
            }
            break;

        default:
            console.warn('🔔 [Notification] Unknown notification type:', type);
    }
};
