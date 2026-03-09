import { Alert } from 'react-native';

export const handleNotificationPress = (data: any, navigation: any) => {
    if (!data || !navigation) {
        console.error('🔔 [Notification] Missing data or navigation!', { data, navigation });
        return;
    }

    const { type, eventId, conversationId, senderId } = data;

    console.log('🔔 [Notification] Handling click:', {
        type,
        eventId,
        conversationId,
        senderId,
        fullData: data
    });

    setTimeout(() => {
        console.log(`🔔 [Notification] Starting navigation for type: ${type}`);

        switch (type) {
            case 'request_new':
            case 'request_approved':
            case 'request_denied':
                if (eventId) {
                    console.log(`🔔 [Notification] Navigating to Feed with eventId: ${eventId}`);
                    navigation.navigate('Main', {
                        screen: 'Feed',
                        params: { eventId }
                    });
                } else {
                    console.error('🔔 [Notification] Missing eventId for event notification');
                }
                break;

            case 'chat_message':
                if (eventId) {
                    console.log(`🔔 [Notification] Navigating to Chat > EventChat with eventId: ${eventId}`);
                    navigation.navigate('Main', {
                        screen: 'Chat',
                        params: {
                            screen: 'EventChat',
                            params: { eventId }
                        }
                    });
                } else {
                    console.error('🔔 [Notification] Missing eventId for chat_message');
                }
                break;

            case 'dm_message':
                if (conversationId) {
                    console.log(`🔔 [Notification] Navigating to Chat > DirectChat with conversationId: ${conversationId}`);
                    navigation.navigate('Main', {
                        screen: 'Chat',
                        params: {
                            screen: 'DirectChat',
                            params: { conversationId }
                        }
                    });
                } else {
                    console.error('🔔 [Notification] Missing conversationId for dm_message');
                }
                break;

            case 'event_cancelled':
                console.log('🔔 [Notification] Showing event_cancelled alert');
                Alert.alert(
                    'Event Cancelled',
                    'The event you were participating in has been cancelled by the host.',
                    [{ text: 'OK' }]
                );
                break;

            case 'kicked':
                console.log('🔔 [Notification] Showing kicked alert');
                Alert.alert(
                    'Removed from Event',
                    'You have been removed from the event.',
                    [{ text: 'OK' }]
                );
                break;

            case 'event_full':
                console.log('🔔 [Notification] Showing event_full alert');
                Alert.alert(
                    'Event Full',
                    'The event is now full.',
                    [{ text: 'OK' }]
                );
                break;

            case 'event_starting':
                if (eventId) {
                    console.log(`🔔 [Notification] Navigating to Feed with eventId: ${eventId}`);
                    navigation.navigate('Main', {
                        screen: 'Feed',
                        params: { eventId }
                    });
                } else {
                    console.error('🔔 [Notification] Missing eventId for event_starting');
                }
                break;

            default:
                console.warn('🔔 [Notification] Unknown notification type:', type);
        }
    }, 300);
};
