import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { notificationsAPI } from '../api/apiClient';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request permissions and register the device's Expo push token with the backend.
 * Call this after the user logs in.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    const token = tokenData.data;

    // Register token with backend
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await notificationsAPI.registerPushToken(token, platform);

    // Android-specific channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF0000',
      });
    }

    return token;
  } catch (error) {
    console.error('Failed to register push notifications:', error);
    return null;
  }
}

/**
 * Unregister push token from backend (call on logout).
 */
export async function unregisterPushNotifications(): Promise<void> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    await notificationsAPI.removePushToken(tokenData.data);
  } catch (error) {
    console.error('Failed to unregister push token:', error);
  }
}
