/**
 * Écran : Ajouter un compte bancaire
 * Nom de la banque + numéro de compte / IBAN → PIN → enregistrement.
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

export function AddBankAccountScreen({ navigation }) {
  const { token } = useApi();
  const [nom_banque, setNom_banque] = useState('');
  const [num_compte, setNum_compte] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const nomOk = nom_banque.trim().length >= 2;
  const numOk = num_compte.trim().length >= 4;
  const pinOk = pin.length === 5 && /^[0-9]+$/.test(pin);

  const onValidateAndNext = () => {
    if (!nomOk) {
      setErrorMsg('Le nom de la banque doit contenir au moins 2 caractères.');
      return;
    }
    if (!numOk) {
      setErrorMsg('Le numéro de compte ou IBAN doit contenir au moins 4 caractères.');
      return;
    }
    setErrorMsg(null);
    setStep('pin');
    setPin('');
  };

  const onRegister = async () => {
    if (!pinOk || !nomOk || !numOk) return;
    setLoading(true);
    setErrorMsg(null);
    const t = token || (await storage.getToken());
    if (!t) {
      setErrorMsg('Session expirée. Reconnectez-vous.');
      setLoading(false);
      return;
    }
    try {
      const res = await api.addBankAccount(t, nom_banque.trim(), num_compte.trim(), pin);
      if (res.success) {
        navigation.goBack();
      } else {
        setErrorMsg(res.message || 'Erreur lors de l\'enregistrement.');
      }
    } catch (e) {
      setErrorMsg(e.message || 'Erreur réseau.');
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
          <Text style={styles.headerTitle}>Compte bancaire</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {step === 'form' && (
              <View style={styles.card}>
                <View style={styles.iconWrap}>
                  <FontAwesome5 name="university" size={28} color={colors.secondary} />
                </View>
                <Text style={styles.cardTitle}>Ajouter un compte bancaire</Text>
                <Text style={styles.cardSub}>Saisissez le nom de la banque et le numéro de compte ou IBAN.</Text>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Nom de la banque</Text>
                  <View style={styles.inputRow}>
                    <FontAwesome5 name="university" size={ICON_SIZE} color={colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: BIC, Equity Bank, Rawbank..."
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      value={nom_banque}
                      onChangeText={(t) => { setNom_banque(t); setErrorMsg(null); }}
                    />
                  </View>
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Numéro de compte / IBAN</Text>
                  <View style={styles.inputRow}>
                    <FontAwesome5 name="hashtag" size={ICON_SIZE} color={colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: CD123456789..."
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      value={num_compte}
                      onChangeText={(t) => { setNum_compte(t); setErrorMsg(null); }}
                      keyboardType="default"
                    />
                  </View>
                </View>
                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
                <TouchableOpacity style={[styles.cta, (!nomOk || !numOk) && styles.ctaDisabled]} onPress={onValidateAndNext} disabled={!nomOk || !numOk} activeOpacity={0.85}>
                  <Text style={styles.ctaText}>Valider et continuer</Text>
                  <FontAwesome5 name="arrow-right" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                </TouchableOpacity>
              </View>
            )}

            {step === 'pin' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Confirmer avec votre PIN</Text>
                <Text style={styles.cardSub}>Entrez votre code PIN à 5 chiffres pour enregistrer ce compte.</Text>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Code PIN</Text>
                  <View style={styles.inputRow}>
                    <FontAwesome5 name="lock" size={ICON_SIZE} color={colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.inputPin]}
                      placeholder="•••••"
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      value={pin}
                      onChangeText={(t) => { setPin(t.replace(/\D/g, '').slice(0, 5)); setErrorMsg(null); }}
                      keyboardType="number-pad"
                      secureTextEntry={!showPin}
                      maxLength={5}
                      autoFocus
                    />
                    <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.eyeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                      <FontAwesome5 name={showPin ? 'eye-slash' : 'eye'} size={18} color="#6B6B6B" />
                    </TouchableOpacity>
                  </View>
                </View>
                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
                <TouchableOpacity style={[styles.cta, (!pinOk || loading) && styles.ctaDisabled]} onPress={onRegister} disabled={!pinOk || loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color={colors.tertiary} /> : (
                    <>
                      <Text style={styles.ctaText}>Enregistrer</Text>
                      <FontAwesome5 name="check" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkBtn} onPress={() => { setStep('form'); setPin(''); setErrorMsg(null); }}>
                  <Text style={styles.linkBtnText}>Modifier les informations</Text>
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>
        </ScrollView>
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
  scroll: { flex: 1, backgroundColor: '#FAFAFC' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: colors.tertiary,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(165,154,247,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: { color: colors.fourth, fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  cardSub: { color: '#6B6B6B', fontSize: 14, marginBottom: 20, lineHeight: 20 },
  fieldWrap: { marginBottom: 20 },
  label: { color: colors.fourth, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: colors.fourth },
  inputPin: { letterSpacing: 8 },
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
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: colors.tertiary, fontSize: 17, fontWeight: 'bold' },
  ctaIcon: { marginLeft: 10 },
  linkBtn: { alignItems: 'center', marginTop: 16 },
  linkBtnText: { color: colors.secondary, fontSize: 15, fontWeight: '600' },
});
