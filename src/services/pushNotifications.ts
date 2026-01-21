import { LogLevel, OneSignal } from 'react-native-onesignal';
import { supabase } from '../config/supabase';
import { handleNotificationPress } from './notificationNavigation';

class PushNotificationService {
  private initialized = false;
  private navigationRef: any = null;

  initialize(oneSignalAppId: string) {
    if (this.initialized) return;

    // Remove this method to stop OneSignal Debugging
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);

    // OneSignal Visualization
    // OneSignal.Debug.setAlertLevel(LogLevel.None);

    // Initialize OneSignal
    OneSignal.initialize(oneSignalAppId);

    // Request permission immediately? Or let manual trigger?
    // Usually good to request on init for this app flow
    this.requestPermissions();

    // Event Listeners for Foreground Notifications
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
      console.log('OneSignal: notification will show in foreground:', event.notification);
      // Always display notification in foreground
      // event.preventDefault() to stop it
    });

    // Event Listeners for Notification Click
    OneSignal.Notifications.addEventListener('click', (event: any) => {
      console.log('🔔 [OneSignal] Notification clicked - FULL EVENT:', JSON.stringify(event, null, 2));
      console.log('🔔 [OneSignal] event.notification:', event.notification);
      console.log('🔔 [OneSignal] event.notification.additionalData:', event.notification?.additionalData);

      const notificationData = event.notification?.additionalData;

      if (notificationData) {
        console.log('🔔 [OneSignal] Navigation data:', notificationData);
        if (this.navigationRef) {
          console.log('🔔 [OneSignal] Navigation ref exists, calling handleNotificationPress');
          handleNotificationPress(notificationData, this.navigationRef);
        } else {
          console.error('🔔 [OneSignal] Navigation ref is NULL!');
        }
      } else {
        console.error('🔔 [OneSignal] No additionalData in notification!');
      }
    });

    this.initialized = true;
  }



  requestPermissions() {
    OneSignal.Notifications.requestPermission(true);
  }

  setUserId(userId: string) {
    // In v5, use Login to identify the user
    console.log('OneSignal: Logging in user', userId);
    OneSignal.login(userId);
  }

  logout() {
    console.log('OneSignal: Logging out user');
    OneSignal.logout();
  }

  setNavigationRef(ref: any) {
    this.navigationRef = ref;
    console.log('OneSignal: Navigation ref set');
  }

  async updatePlayerIdInDatabase(userId: string) {
    // In v5, we rely on External User ID (set via Login).
    // The previous logic stored 'player_id' (push_token) in Supabase.
    // We can still try to get the subscription ID if needed, 
    // but typically targeting by External ID is preferred.
    // For now, let's keep the user identifying flow simple:
    // Just ensure OneSignal knows the External ID.

    // If we really need the push token in Supabase:
    // OneSignal.User.pushSubscription.getPushSubscriptionId();
    // But async fetching is different in v5.

    // We will skip manual token sync to Supabase for now as we rely on OneSignal's user mapping.
    // If you need to send notifications from Supabase Edge Functions, 
    // you should use "include_external_user_ids" and pass the UUID.
  }
}

export const pushNotificationService = new PushNotificationService();
