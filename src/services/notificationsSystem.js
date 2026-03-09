/**
 * Notifications système (barre de statut Android/iOS) et vibration.
 * En Expo Go (SDK 53+) : seule la vibration est utilisée (expo-notifications non chargé pour éviter l’erreur).
 * En development build / production : expo-notifications affiche la notif dans la barre de statut.
 */
import { Platform } from 'react-native';
import { Vibration } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

/** Toujours faire vibrer (fonctionne en Expo Go). */
function doVibrate() {
  try {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      Vibration.vibrate(400);
    }
  } catch (_) {}
}

/**
 * Affiche une notification dans la barre de statut (si dispo) et fait vibrer le téléphone.
 * En Expo Go : on ne charge pas expo-notifications, seule la vibration est exécutée.
 */
export async function showSystemNotification(title, body, count = 1) {
  doVibrate();
  if (isExpoGo) return;

  try {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
      }),
    });

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'RIPA',
        body: body || (count === 1 ? '1 nouvelle notification' : `${count} nouvelles notifications`),
        sound: true,
      },
      trigger: null,
    });
  } catch (_) {}
}

/** Conservé pour compatibilité ; no-op en Expo Go. */
export async function requestNotificationPermissions() {
  if (isExpoGo) return;
  try {
    const Notifications = require('expo-notifications');
    await Notifications.getPermissionsAsync();
    await Notifications.requestPermissionsAsync();
  } catch (_) {}
}
