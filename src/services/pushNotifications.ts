import OneSignal from 'react-native-onesignal';
import { supabase } from '../config/supabase';

class PushNotificationService {
  private initialized = false;

  async initialize(oneSignalAppId: string) {
    if (this.initialized) return;

    // Initialize OneSignal
    OneSignal.setAppId(oneSignalAppId);

    // Prompt for push notification permissions
    OneSignal.promptForPushNotificationsWithUserResponse((response) => {
      console.log('Push notification permission:', response);
    });

    // Handle notification opened
    OneSignal.setNotificationOpenedHandler((notification) => {
      console.log('Notification opened:', notification);
      // Handle notification tap - navigate to relevant screen
    });

    // Handle notification received while app is in foreground
    OneSignal.setNotificationWillShowInForegroundHandler((notificationReceivedEvent) => {
      const notification = notificationReceivedEvent.getNotification();
      console.log('Notification received:', notification);
      // Display notification even when app is in foreground
      notificationReceivedEvent.complete(notification);
    });

    this.initialized = true;
  }

  async setUserId(userId: string) {
    // Set external user ID for targeting
    OneSignal.setExternalUserId(userId);
  }

  async getPlayerId(): Promise<string | null> {
    const deviceState = await OneSignal.getDeviceState();
    return deviceState?.userId || null;
  }

  async updatePlayerIdInDatabase(userId: string) {
    try {
      const playerId = await this.getPlayerId();
      if (!playerId) return;

      await supabase
        .from('profiles')
        .update({ push_token: playerId })
        .eq('id', userId);

      console.log('Player ID updated in database:', playerId);
    } catch (error) {
      console.error('Failed to update player ID:', error);
    }
  }

  async sendNotificationToUser(userId: string, message: string, heading: string, data?: any) {
    try {
      // Get user's player ID from database
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (!profile?.push_token) {
        console.log('User has no push token');
        return;
      }

      // Send notification via OneSignal REST API
      // This should be done from a backend function for security
      console.log('Send notification to player:', profile.push_token);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async disableNotifications() {
    OneSignal.disablePush(true);
  }

  async enableNotifications() {
    OneSignal.disablePush(false);
  }
}

export const pushNotificationService = new PushNotificationService();
