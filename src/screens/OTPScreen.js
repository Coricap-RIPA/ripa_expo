/**
 * Écran de vérification OTP après inscription
 *
 * - Saisie du code à 4 chiffres reçu par SMS
 * - En dev : affichage du code OTP + log en console pour tester
 * - Succès → setAuth → navigation automatique vers Accueil (RootNavigator)
 *
 * Design aligné avec RegisterScreen : fond primaire, cartes, icônes, CTA.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import * as api from '../services/api';
import { useApi } from '../context/ApiContext';

const ICON_SIZE = 20;

export function OTPScreen({ route, navigation }) {
  const { userId, otpCode: devOtp } = route.params || {};
  const { setAuth, setError, error } = useApi();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (devOtp) {
      console.log('[RIPA OTP] Code pour test:', devOtp);
    }
  }, [devOtp]);

  const handleCodeChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (error) setError(null);
  };

  const onVerify = async () => {
    if (!code.trim() || !userId) return;
    setLoading(true);
    try {
      const res = await api.verifyOtp(userId, code.trim());
      if (res.success && res.data?.token && res.data?.user) {
        await setAuth(res.data.token, res.data.user);
      } else {
        setError(res.message || 'Code invalide.');
      }
    } catch (e) {
      setError(e.message || 'Erreur de vérification.');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!userId) return;
    setResendLoading(true);
    try {
      const res = await api.resendOtp(userId);
      if (res.success && res.data?.otp_code) {
        setCode(res.data.otp_code);
        console.log('[RIPA OTP] Nouveau code (renvoyé):', res.data.otp_code);
      }
    } catch (e) {
      console.warn('[RIPA OTP] Renvoi échoué', e);
    }
    setResendLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <FontAwesome5 name="key" size={24} color={colors.tertiary} style={styles.titleIcon} />
          <Text style={styles.title}>Vérification</Text>
        </View>
        <Text style={styles.subtitle}>
          Entrez le code à 4 chiffres envoyé sur votre numéro de téléphone.
        </Text>

        {/* En dev : afficher le code OTP pour tester */}
        {devOtp ? (
          <View style={styles.devBox}>
            <Text style={styles.devLabel}>Code pour test (voir aussi la console)</Text>
            <Text style={styles.devCode}>{devOtp}</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Code OTP</Text>
          <TextInput
            style={styles.input}
            placeholder="••••"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            selectionColor={colors.secondary}
          />
        </View>

        <TouchableOpacity
          style={[styles.cta, (!code.trim() || loading) && styles.ctaDisabled]}
          onPress={onVerify}
          disabled={!code.trim() || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.tertiary} />
          ) : (
            <>
              <Text style={styles.ctaText}>Vérifier</Text>
              <FontAwesome5 name="check" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkBtn, resendLoading && styles.linkBtnDisabled]}
          onPress={onResend}
          disabled={resendLoading}
          activeOpacity={0.85}
        >
          <FontAwesome5 name="redo" size={ICON_SIZE} color={colors.secondary} style={styles.ctaIconLeft} />
          <Text style={styles.linkBtnText}>{resendLoading ? 'Envoi en cours...' : 'Renvoyer le code'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: 40,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleIcon: {
    marginRight: 12,
  },
  title: {
    color: colors.tertiary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    marginBottom: 24,
  },
  devBox: {
    backgroundColor: 'rgba(165,154,247,0.25)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(165,154,247,0.5)',
  },
  devLabel: {
    color: colors.secondary,
    fontSize: 13,
    marginBottom: 6,
  },
  devCode: {
    color: colors.tertiary,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  errorText: {
    color: '#ffb3b3',
    fontSize: 14,
    marginBottom: 16,
  },
  fieldWrap: {
    marginBottom: 24,
  },
  label: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    fontSize: 22,
    letterSpacing: 8,
    color: colors.tertiary,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(165,154,247,0.35)',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 18,
    borderRadius: 14,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
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
  ctaIconLeft: {
    marginRight: 10,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 14,
  },
  linkBtnDisabled: {
    opacity: 0.6,
  },
  linkBtnText: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
