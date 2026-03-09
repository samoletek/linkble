import { LogLevel, OneSignal } from 'react-native-onesignal';
import { supabase } from '../config/supabase';
import { handleNotificationPress } from './notificationNavigation';

class PushNotificationService {
  private initialized = false;
  private navigationRef: any = null;

  initialize(oneSignalAppId: string) {
    if (this.initialized) return;

    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    OneSignal.initialize(oneSignalAppId);
    this.requestPermissions();
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
      console.log('OneSignal: notification will show in foreground:', event.notification);
    });

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
    void userId;
  }
}

export const pushNotificationService = new PushNotificationService();
