/**
 * Stockage local RIPA
 * - JWT : SecureStore + AsyncStorage (fallback). Expo Go peut ne pas persister SecureStore
 *   après fermeture de l'app → on lit aussi AsyncStorage pour que le token survive au redémarrage.
 * - Préférences : AsyncStorage
 * Aucune permission utilisateur requise pour SecureStore ni AsyncStorage.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'ripa_jwt_token';
const TOKEN_KEY_ASYNC = 'ripa_jwt_token_async';
const HAS_SEEN_WELCOME_KEY = 'ripa_has_seen_welcome';

/** Récupère le token JWT (SecureStore d'abord, puis AsyncStorage si null — persiste après kill app / Expo Go) */
export async function getToken() {
  try {
    let token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      console.log('[RIPA JWT] Lu au démarrage (SecureStore), longueur:', token.length, 'début:', token.substring(0, 40) + '...');
      return token;
    }
    token = await AsyncStorage.getItem(TOKEN_KEY_ASYNC);
    if (token) {
      console.log('[RIPA JWT] Lu au démarrage (AsyncStorage), longueur:', token.length, 'début:', token.substring(0, 40) + '...');
      return token;
    }
    console.log('[RIPA JWT] Aucun token trouvé au démarrage (SecureStore et AsyncStorage vides)');
    return null;
  } catch (e) {
    console.log('[RIPA JWT] Erreur lecture token:', e?.message || e);
    return null;
  }
}

/** Enregistre le token après login ou OTP (écrit dans les deux pour persistance fiable) */
export async function setToken(token) {
  const len = token ? token.length : 0;
  const preview = token ? token.substring(0, 40) + '...' : '(vide)';
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    console.log('[RIPA JWT] Stocké (SecureStore), longueur:', len, 'début:', preview);
  } catch (e) {
    console.log('[RIPA JWT] Erreur écriture SecureStore:', e?.message || e);
  }
  try {
    await AsyncStorage.setItem(TOKEN_KEY_ASYNC, token);
    console.log('[RIPA JWT] Stocké (AsyncStorage), longueur:', len);
  } catch (e) {
    console.log('[RIPA JWT] Erreur écriture AsyncStorage:', e?.message || e);
  }
}

/** Supprime le token (déconnexion) */
export async function removeToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (e) {}
  try {
    await AsyncStorage.removeItem(TOKEN_KEY_ASYNC);
  } catch (e) {}
}

/** L'app a-t-elle déjà affiché l'écran de bienvenue ? */
export async function getHasSeenWelcome() {
  try {
    const v = await AsyncStorage.getItem(HAS_SEEN_WELCOME_KEY);
    return v === 'true';
  } catch (e) {
    return false;
  }
}

/** Marquer que l'écran de bienvenue a été vu */
export async function setHasSeenWelcome() {
  try {
    await AsyncStorage.setItem(HAS_SEEN_WELCOME_KEY, 'true');
  } catch (e) {}
}
