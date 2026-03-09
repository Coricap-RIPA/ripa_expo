/**
 * Écran : Enregistrer une carte bancaire (physique)
 * Formulaire type Visa/Mastercard : PAN, date expiration, CVV → puis PIN → envoi backend.
 * KYC obligatoire (backend renvoie 403 si non fait).
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/theme';
import { useApi } from '../context/ApiContext';
import * as api from '../services/api';
import * as storage from '../services/storage';

const ICON_SIZE = 20;

function formatPan(value) {
  const v = value.replace(/\D/g, '').slice(0, 16);
  return v.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  let v = value.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
  return v;
}

export function RegisterCardScreen({ navigation }) {
  const { token } = useApi();
  const [pan, setPan] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [step, setStep] = useState('card'); // 'card' | 'pin'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const panRaw = pan.replace(/\s/g, '');
  const panOk = panRaw.length >= 15 && /^\d+$/.test(panRaw);
  const expiryOk = /^\d{2}\/\d{2}$/.test(expiry);
  const cvvOk = cvv.length >= 3 && /^\d+$/.test(cvv);
  const pinOk = pin.length === 5 && /^[0-9]+$/.test(pin);
  const cardFormOk = panOk && expiryOk && cvvOk;

  const onPanChange = (text) => setPan(formatPan(text));
  const onExpiryChange = (text) => setExpiry(formatExpiry(text));
  const onCvvChange = (text) => setCvv(text.replace(/\D/g, '').slice(0, 4));

  const onValidateAndNext = () => {
    if (!cardFormOk) {
      setErrorMsg('Vérifiez le numéro de carte, la date et le CVV.');
      return;
    }
    setErrorMsg(null);
    setStep('pin');
    setPin('');
  };

  const onRegister = async () => {
    if (!pinOk) return;
    setLoading(true);
    setErrorMsg(null);
    const t = token || (await storage.getToken());
    if (!t) {
      setErrorMsg('Session expirée.');
      setLoading(false);
      return;
    }
    try {
      const res = await api.registerCard(t, panRaw, expiry, cvv, pin);
      if (res.success) {
        navigation.goBack();
        return;
      }
      setErrorMsg(res.message || 'Erreur.');
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('KYC') || msg.includes('403')) {
        setErrorMsg("Complétez votre KYC avant d'enregistrer une carte. Menu Paramètres puis KYC.");
      } else {
        setErrorMsg(msg || 'Erreur réseau.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={[colors.primary, '#3d0f5c']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <FontAwesome5 name="arrow-left" size={ICON_SIZE} color={colors.tertiary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Carte bancaire</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Bloc visuel type carte */}
            <View style={styles.cardVisual}>
              <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.cardVisualGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.cardVisualTop}>
                  <View style={styles.chip} />
                  <Text style={styles.cardBrand}>{panRaw.startsWith('4') ? 'VISA' : 'Mastercard'}</Text>
                </View>
                <Text style={styles.cardPan}>{pan ? formatPan(pan) : '•••• •••• •••• ••••'}</Text>
                <View style={styles.cardVisualBottom}>
                  <View>
                    <Text style={styles.cardLabel}>EXPIRATION</Text>
                    <Text style={styles.cardValue}>{expiry || 'MM/YY'}</Text>
                  </View>
                  <View>
                    <Text style={styles.cardLabel}>CVV</Text>
                    <Text style={styles.cardValue}>{cvv ? '•'.repeat(cvv.length) : '•••'}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {step === 'card' && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Informations de la carte</Text>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Numéro de carte (PAN)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor="#999"
                    value={pan}
                    onChangeText={onPanChange}
                    keyboardType="number-pad"
                    maxLength={19}
                  />
                </View>
                <View style={styles.row}>
                  <View style={[styles.fieldWrap, styles.half]}>
                    <Text style={styles.label}>MM/YY</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="12/28"
                      placeholderTextColor="#999"
                      value={expiry}
                      onChangeText={onExpiryChange}
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                  </View>
                  <View style={[styles.fieldWrap, styles.half]}>
                    <Text style={styles.label}>CVV</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="123"
                      placeholderTextColor="#999"
                      value={cvv}
                      onChangeText={onCvvChange}
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={4}
                    />
                  </View>
                </View>
                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
                <TouchableOpacity style={[styles.cta, !cardFormOk && styles.ctaDisabled]} onPress={onValidateAndNext} disabled={!cardFormOk} activeOpacity={0.85}>
                  <Text style={styles.ctaText}>Continuer</Text>
                  <FontAwesome5 name="arrow-right" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                </TouchableOpacity>
              </View>
            )}

            {step === 'pin' && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Confirmer avec votre PIN</Text>
                <Text style={styles.formSub}>Entrez votre code PIN à 5 chiffres pour enregistrer cette carte.</Text>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Code PIN</Text>
                  <View style={styles.inputRow}>
                    <FontAwesome5 name="lock" size={ICON_SIZE} color={colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.inputPin]}
                      placeholder="•••••"
                      placeholderTextColor="#999"
                      value={pin}
                      onChangeText={(t) => { setPin(t.replace(/\D/g, '').slice(0, 5)); setErrorMsg(null); }}
                      keyboardType="number-pad"
                      secureTextEntry={!showPin}
                      maxLength={5}
                      autoFocus
                    />
                    <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.eyeBtn}>
                      <FontAwesome5 name={showPin ? 'eye-slash' : 'eye'} size={18} color="#6B6B6B" />
                    </TouchableOpacity>
                  </View>
                </View>
                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
                <TouchableOpacity style={[styles.cta, (!pinOk || loading) && styles.ctaDisabled]} onPress={onRegister} disabled={!pinOk || loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color={colors.tertiary} /> : (
                    <>
                      <Text style={styles.ctaText}>Enregistrer la carte</Text>
                      <FontAwesome5 name="check" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkBtn} onPress={() => { setStep('card'); setPin(''); setErrorMsg(null); }}>
                  <Text style={styles.linkBtnText}>Modifier la carte</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: colors.tertiary, fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 36 },
  container: { flex: 1, backgroundColor: '#FAFAFC' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60, flexGrow: 1 },
  cardVisual: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  cardVisualGradient: {
    padding: 24,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cardVisualTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { width: 44, height: 34, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.25)' },
  cardBrand: { color: colors.tertiary, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  cardPan: { color: colors.tertiary, fontSize: 20, letterSpacing: 3 },
  cardVisualBottom: { flexDirection: 'row', gap: 32 },
  cardLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginBottom: 2 },
  cardValue: { color: colors.tertiary, fontSize: 14, fontWeight: '600' },
  formCard: {
    backgroundColor: colors.tertiary,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: { color: colors.fourth, fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  formSub: { color: '#6B6B6B', fontSize: 14, marginBottom: 20 },
  fieldWrap: { marginBottom: 18 },
  half: { flex: 1 },
  row: { flexDirection: 'row', gap: 16 },
  label: { color: colors.fourth, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.fourth,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  inputIcon: { marginRight: 12 },
  inputPin: { flex: 1, paddingVertical: 16, fontSize: 18, letterSpacing: 8 },
  eyeBtn: { padding: 8 },
  errorText: { color: '#c62828', fontSize: 14, marginBottom: 16 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 18,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: colors.tertiary, fontSize: 17, fontWeight: 'bold' },
  ctaIcon: { marginLeft: 10 },
  linkBtn: { alignItems: 'center', marginTop: 16 },
  linkBtnText: { color: colors.secondary, fontSize: 15, fontWeight: '600' },
});
