/**
 * Écran : Ajouter un compte Mobile Money
 * Numéro avec indicatif pays obligatoire (+), validation, puis PIN → enregistrement.
 * Succès : liste des comptes + option "Ajouter un autre". Design moderne cohérent RIPA.
 */
import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/theme';
import { useApi } from '../context/ApiContext';
import * as api from '../services/api';
import * as storage from '../services/storage';

const PHONE_PLACEHOLDER = '+243 9XX XXX XXX';
const ICON_SIZE = 20;

export function AddMobileMoneyScreen({ navigation, route }) {
  const { token, setError } = useApi();
  const [numCompte, setNumCompte] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'pin' | 'success'
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const numNormalized = numCompte.replace(/\s/g, '');
  const numOk = /^\+[0-9]{10,15}$/.test(numNormalized);
  const pinOk = pin.length === 5 && /^[0-9]+$/.test(pin);

  const fetchAccounts = useCallback(async () => {
    const t = token || (await storage.getToken());
    if (!t) return;
    try {
      const res = await api.getAccounts(t);
      if (res.success && res.data?.accounts) setAccounts(res.data.accounts);
    } catch (e) {
      setAccounts([]);
    }
  }, [token]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const onNumChange = (text) => {
    let v = text.replace(/\s/g, '');
    if (v && !v.startsWith('+')) v = '+' + v.replace(/^0+/, '');
    if (/^\+?[0-9]*$/.test(v)) setNumCompte(v);
    setErrorMsg(null);
  };

  const onValidateAndNext = () => {
    if (!numOk) {
      setErrorMsg('Le numéro doit commencer par + et l\'indicatif pays (ex: +243...)');
      return;
    }
    setErrorMsg(null);
    setStep('pin');
    setPin('');
  };

  const onRegister = async () => {
    if (!pinOk || !numOk) return;
    setLoading(true);
    setErrorMsg(null);
    const t = token || (await storage.getToken());
    if (!t) {
      setErrorMsg('Session expirée. Reconnectez-vous.');
      setLoading(false);
      return;
    }
    try {
      const res = await api.addAccount(t, numNormalized, pin);
      if (res.success) {
        setStep('success');
        setNumCompte('');
        setPin('');
        await fetchAccounts();
        // Si on venait du flux carte virtuelle, on reste sur l'écran succès avec option de continuer
      } else {
        setErrorMsg(res.message || 'Erreur lors de l\'enregistrement.');
      }
    } catch (e) {
      setErrorMsg(e.message || 'Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const onAddAnother = () => {
    setStep('form');
    setErrorMsg(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAccounts();
    setRefreshing(false);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <LinearGradient colors={[colors.primary, '#3d0f5c']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <FontAwesome5 name="arrow-left" size={ICON_SIZE} color={colors.tertiary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mobile Money</Text>
            <View style={styles.headerSpacer} />
          </LinearGradient>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
          >
            {step === 'form' && (
              <>
                <View style={styles.card}>
                  <View style={styles.iconWrap}>
                    <FontAwesome5 name="mobile-alt" size={28} color={colors.secondary} />
                  </View>
                  <Text style={styles.cardTitle}>Ajouter un compte</Text>
                  <Text style={styles.cardSub}>Saisissez le numéro avec l’indicatif pays (ex: +243...)</Text>
                  <View style={styles.fieldWrap}>
                    <Text style={styles.label}>Numéro Mobile Money</Text>
                    <View style={styles.inputRow}>
                      <FontAwesome5 name="phone" size={ICON_SIZE} color={colors.primary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder={PHONE_PLACEHOLDER}
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={numCompte}
                        onChangeText={onNumChange}
                        keyboardType="phone-pad"
                        autoCapitalize="none"
                      />
                    </View>
                    {!numOk && numCompte.length > 0 && (
                      <Text style={styles.hintError}>Indicatif pays obligatoire (ex: +243...)</Text>
                    )}
                  </View>
                  {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
                  <TouchableOpacity style={[styles.cta, !numOk && styles.ctaDisabled]} onPress={onValidateAndNext} disabled={!numOk} activeOpacity={0.85}>
                    <Text style={styles.ctaText}>Valider et continuer</Text>
                    <FontAwesome5 name="arrow-right" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {step === 'pin' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Confirmer avec votre PIN</Text>
                <Text style={styles.cardSub}>Entrez votre code PIN à 5 chiffres pour enregistrer ce compte</Text>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Code PIN</Text>
                  <View style={styles.inputRow}>
                    <FontAwesome5 name="lock" size={ICON_SIZE} color={colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.inputPin]}
                      placeholder="•••••"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={pin}
                      onChangeText={(t) => { setPin(t.replace(/\D/g, '').slice(0, 5)); setErrorMsg(null); }}
                      keyboardType="number-pad"
                      secureTextEntry={!showPin}
                      maxLength={5}
                      autoFocus
                    />
                    <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.eyeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                      <FontAwesome5 name={showPin ? 'eye-slash' : 'eye'} size={18} color="rgba(255,255,255,0.8)" />
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
                  <Text style={styles.linkBtnText}>Modifier le numéro</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'success' && (
              <View style={styles.card}>
                <View style={styles.successIconWrap}>
                  <FontAwesome5 name="check-circle" size={48} color="#2E7D32" />
                </View>
                <Text style={styles.successTitle}>Compte enregistré</Text>
                <Text style={styles.cardSub}>Votre compte Mobile Money a bien été ajouté.</Text>
                {route.params?.fromOrderVirtual && route.params?.brand ? (
                  <TouchableOpacity style={styles.cta} onPress={() => navigation.replace('OrderVirtualCard', { fromOrderVirtual: true, brand: route.params.brand })} activeOpacity={0.85}>
                    <Text style={styles.ctaText}>Continuer vers la carte virtuelle</Text>
                    <FontAwesome5 name="credit-card" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.cta} onPress={onAddAnother} activeOpacity={0.85}>
                    <Text style={styles.ctaText}>Ajouter un autre compte</Text>
                    <FontAwesome5 name="plus" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.goBack()}>
                  <Text style={styles.linkBtnText}>Retour à l’accueil</Text>
                </TouchableOpacity>
              </View>
            )}

            {accounts.length > 0 && (
              <View style={styles.listSection}>
                <Text style={styles.listSectionTitle}>Vos comptes Mobile Money</Text>
                {accounts.map((acc) => (
                  <View key={acc.id} style={styles.accountRow}>
                    <View style={styles.accountIconWrap}>
                      <FontAwesome5 name="mobile-alt" size={18} color={colors.primary} />
                    </View>
                    <Text style={styles.accountNumber}>{acc.number_masked}</Text>
                  </View>
                ))}
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
  container: { flex: 1 },
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
    marginBottom: 20,
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
  hintError: { color: '#c62828', fontSize: 12, marginTop: 6 },
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
  successIconWrap: { alignItems: 'center', marginBottom: 16 },
  successTitle: { color: '#2E7D32', fontSize: 22, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  listSection: { marginTop: 8 },
  listSectionTitle: { color: colors.fourth, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tertiary,
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  accountIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8E0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  accountNumber: { color: colors.fourth, fontSize: 15, fontWeight: '600' },
});
