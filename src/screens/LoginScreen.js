/**
 * Écran de connexion – utilisateur déjà inscrit
 * Téléphone + PIN (5 chiffres) → vérification backend → token → accès à l'app.
 * Design type app paiement : fond dégradé, carte centrée, icônes, messages d'erreur clairs.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import * as api from '../services/api';
import { useApi } from '../context/ApiContext';

const ICON_SIZE = 20;
const PHONE_PLACEHOLDER = '+243 812 345 678';

export function LoginScreen({ navigation }) {
  const { setAuth, setError, error } = useApi();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const phoneClean = phone.replace(/\s/g, '');
  const phoneOk = /^\+?[0-9]{10,15}$/.test(phoneClean);
  const phoneWithPlus = phoneClean.startsWith('+') ? phoneClean : `+${phoneClean}`;
  const pinOk = pin.length === 5 && /^[0-9]+$/.test(pin);
  const canSubmit = phoneOk && pinOk;

  const onPhoneChange = (text) => {
    setPhone(text);
    if (error) setError(null);
  };

  const onPinChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 5);
    setPin(digits);
    if (error) setError(null);
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(phoneWithPlus, pin);
      if (res.success && res.data?.token && res.data?.user) {
        await setAuth(res.data.token, res.data.user);
        // Token stocké : à la prochaine ouverture → UnlockScreen (PIN seul) puis Home
      } else {
        setError(res.message || 'Connexion refusée.');
      }
    } catch (e) {
      setError(e.message || 'Erreur de connexion. Vérifiez le numéro et le PIN.');
    } finally {
      setLoading(false);
    }
  };

  const goRegister = () => {
    setError(null);
    navigation.replace('Register');
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={[colors.primary, '#3d0f5c', '#2a0845']}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header avec icône */}
          <View style={styles.header}>
            <View style={styles.iconRing}>
              <FontAwesome5 name="shield-alt" size={44} color={colors.secondary} />
            </View>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>
              Entrez votre numéro et votre code PIN pour accéder à votre espace
            </Text>
          </View>

          {/* Carte formulaire */}
          <View style={styles.card}>
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Numéro de téléphone</Text>
              <View style={styles.inputRow}>
                <FontAwesome5 name="phone-alt" size={ICON_SIZE} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={PHONE_PLACEHOLDER}
                  placeholderTextColor="#9B9B9B"
                  value={phone}
                  onChangeText={onPhoneChange}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Code PIN (5 chiffres)</Text>
              <View style={styles.inputRow}>
                <FontAwesome5 name="lock" size={ICON_SIZE} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputPin]}
                  placeholder="•••••"
                  placeholderTextColor="#9B9B9B"
                  value={pin}
                  onChangeText={onPinChange}
                  keyboardType="number-pad"
                  secureTextEntry={!showPin}
                  maxLength={5}
                />
                <TouchableOpacity
                  onPress={() => setShowPin(!showPin)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <FontAwesome5 name={showPin ? 'eye-slash' : 'eye'} size={18} color="#6B6B6B" />
                </TouchableOpacity>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.cta, (!canSubmit || loading) && styles.ctaDisabled]}
              onPress={onSubmit}
              disabled={!canSubmit || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.tertiary} />
              ) : (
                <>
                  <Text style={styles.ctaText}>Accéder à l'application</Text>
                  <FontAwesome5 name="arrow-right" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Lien inscription */}
          <TouchableOpacity style={styles.linkWrap} onPress={goRegister} activeOpacity={0.8}>
            <Text style={styles.linkText}>Pas encore de compte ? </Text>
            <Text style={styles.linkBold}>Créer un compte</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(165,154,247,0.4)',
  },
  title: {
    color: colors.tertiary,
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.tertiary,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  fieldWrap: {
    marginBottom: 20,
  },
  label: {
    color: colors.fourth,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.fourth,
  },
  inputPin: {
    letterSpacing: 8,
  },
  eyeBtn: {
    padding: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 10,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: colors.tertiary,
    fontSize: 17,
    fontWeight: 'bold',
  },
  ctaIcon: {
    marginLeft: 10,
  },
  linkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  linkText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
  },
  linkBold: {
    color: colors.secondary,
    fontSize: 15,
    fontWeight: 'bold',
  },
});
