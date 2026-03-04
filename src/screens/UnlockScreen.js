/**
 * Écran de déverrouillage par PIN (utilisateur avec token stocké)
 * PIN → verifyPin(token, pin) → backend vérifie → accès Home ou message d'erreur.
 * Design type app bancaire : fond dégradé, 5 points PIN, clavier numérique intégré.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Animated,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { useApi } from '../context/ApiContext';

const { width } = Dimensions.get('window');
const KEYPAD_SIZE = (width - 48 - 48) / 3 - 12; // 3 colonnes, padding 24*2, gaps

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

export function UnlockScreen() {
  const { user, unlockWithPin, logout, error, setError } = useApi();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const pinOk = pin.length === 5;
  const displayName = user?.nom_complet || user?.phone || 'Utilisateur';

  const onKeyPress = (key) => {
    if (error) setError(null);
    if (key === 'back') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (key === '' || pin.length >= 5) return;
    setPin((p) => p + key);
  };

  const runShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const onSubmit = async () => {
    if (!pinOk || loading) return;
    setLoading(true);
    setError(null);
    try {
      const ok = await unlockWithPin(pin);
      if (ok) {
        setPin('');
        // RootNavigator affiche Home
      } else {
        setPin('');
        runShake();
      }
    } finally {
      setLoading(false);
    }
  };

  const onLogout = () => {
    setError(null);
    setPin('');
    logout();
  };

  const shakeTranslate = shakeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <LinearGradient
        colors={['#1a0228', colors.primary, '#3d0f5c', '#2a0845']}
        locations={[0, 0.35, 0.7, 1]}
        style={styles.container}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header : icône + salutation */}
            <View style={styles.header}>
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={['rgba(165,154,247,0.4)', 'rgba(165,154,247,0.15)']}
              style={styles.iconRing}
            >
              <FontAwesome5 name="shield-alt" size={36} color={colors.secondary} />
            </LinearGradient>
          </View>
          <Text style={styles.greeting}>Bonjour, {displayName}</Text>
          <Text style={styles.subtitle}>Entrez votre code PIN pour accéder à RIPA</Text>
        </View>

        {/* 5 points PIN */}
        <Animated.View
          style={[
            styles.dotsWrap,
            {
              transform: [
                {
                  translateX: shakeAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] }),
                },
              ],
            },
          ]}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                pin.length > i && styles.dotFilled,
                error && styles.dotError,
              ]}
            />
          ))}
        </Animated.View>

        {/* Message d'erreur backend */}
        {error ? (
          <View style={styles.errorWrap}>
            <FontAwesome5 name="exclamation-circle" size={18} color="#fff" style={styles.errorIcon} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Bouton Accéder (actif quand 5 chiffres) */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={[styles.cta, (!pinOk || loading) && styles.ctaDisabled]}
            onPress={onSubmit}
            disabled={!pinOk || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.tertiary} size="small" />
            ) : (
              <>
                <Text style={styles.ctaText}>Accéder à l'application</Text>
                <FontAwesome5 name="arrow-right" size={18} color={colors.tertiary} style={styles.ctaIcon} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Clavier numérique */}
        <View style={styles.keypad}>
          {DIGITS.map((key, index) =>
            key === '' ? (
              <View key={`empty-${index}`} style={styles.keypadKey} />
            ) : (
              <TouchableOpacity
                key={key}
                style={styles.keypadKey}
                onPress={() => onKeyPress(key)}
                activeOpacity={0.6}
                disabled={loading}
              >
                {key === 'back' ? (
                  <FontAwesome5 name="backspace" size={24} color="rgba(255,255,255,0.9)" />
                ) : (
                  <Text style={styles.keypadDigit}>{key}</Text>
                )}
              </TouchableOpacity>
            )
          )}
        </View>

            {/* Lien "Ce n'est pas moi" */}
            <TouchableOpacity style={styles.linkWrap} onPress={onLogout} activeOpacity={0.8}>
              <FontAwesome5 name="user-times" size={14} color="rgba(255,255,255,0.75)" style={styles.linkIcon} />
              <Text style={styles.linkText}>Ce n'est pas moi</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrap: {
    marginBottom: 20,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(165,154,247,0.5)',
  },
  greeting: {
    color: colors.tertiary,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  dotsWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 14,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  dotFilled: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
    transform: [{ scale: 1.1 }],
  },
  dotError: {
    borderColor: 'rgba(255,120,120,0.8)',
  },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200,80,80,0.35)',
    marginHorizontal: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  errorIcon: {
    marginRight: 10,
  },
  errorText: {
    color: colors.tertiary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  ctaWrap: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaText: {
    color: colors.tertiary,
    fontSize: 17,
    fontWeight: 'bold',
  },
  ctaIcon: {
    marginLeft: 12,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
    maxWidth: width,
  },
  keypadKey: {
    width: KEYPAD_SIZE,
    height: KEYPAD_SIZE,
    borderRadius: KEYPAD_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  keypadDigit: {
    color: colors.tertiary,
    fontSize: 26,
    fontWeight: '600',
  },
  linkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    paddingVertical: 14,
  },
  linkIcon: {
    marginRight: 8,
  },
  linkText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '500',
  },
});
