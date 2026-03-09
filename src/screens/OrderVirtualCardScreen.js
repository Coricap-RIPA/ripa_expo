/**
 * Écran : Commander une carte virtuelle
 * Flux : vérif KYC → aperçu (ou message si déjà une carte) → choix Visa/Mastercard
 * → vérif Mobile Money (sinon redirection AddMobileMoney) → confirmation 1 $ → PIN → API → succès.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/theme';
import { useApi } from '../context/ApiContext';
import * as api from '../services/api';
import * as storage from '../services/storage';

const ICON_SIZE = 22;

export function OrderVirtualCardScreen({ navigation, route }) {
  const { token } = useApi();
  const [loading, setLoading] = useState(true);
  const [kycValid, setKycValid] = useState(false);
  const [hasVirtualCard, setHasVirtualCard] = useState(false);
  const [virtualCard, setVirtualCard] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [step, setStep] = useState('overview'); // overview | brand | need_mobile_money | confirm | pin | success
  const [brand, setBrand] = useState(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const pinOk = pin.length === 5 && /^[0-9]+$/.test(pin);

  const fetchData = useCallback(async () => {
    const t = token || (await storage.getToken());
    if (!t) return;
    try {
      const [kycRes, cardsRes, accRes] = await Promise.all([
        api.getKyc(t),
        api.getCards(t),
        api.getAccounts(t),
      ]);
      const hasKyc = kycRes.success && kycRes.data?.statut === 'valide';
      setKycValid(!!hasKyc);
      const cards = cardsRes.success && cardsRes.data?.cards ? cardsRes.data.cards : [];
      const virtual = cards.find((c) => c.type === 'virtuelle');
      setHasVirtualCard(!!virtual);
      setVirtualCard(virtual || null);
      const accs = accRes.success && accRes.data?.accounts ? accRes.data.accounts : [];
      setAccounts(accs);
    } catch (e) {
      setErrorMsg(e.message || 'Erreur chargement.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fromAdd = route.params?.fromOrderVirtual;
    const brandParam = route.params?.brand;
    if (fromAdd && brandParam && !loading) {
      setBrand(brandParam);
      setStep('confirm');
      setErrorMsg(null);
    }
  }, [route.params?.fromOrderVirtual, route.params?.brand, loading]);

  const goToKyc = () => {
    navigation.replace('Kyc');
  };

  const onChooseBrand = (b) => {
    setBrand(b);
    setErrorMsg(null);
    if (accounts.length === 0) {
      setStep('need_mobile_money');
    } else {
      setStep('confirm');
    }
  };

  const goToAddMobileMoney = () => {
    navigation.navigate('AddMobileMoney', { fromOrderVirtual: true, brand });
  };

  const onConfirmAndPay = () => {
    setErrorMsg(null);
    setStep('pin');
    setPin('');
  };

  const onSubmit = async () => {
    if (!pinOk) return;
    setSubmitting(true);
    setErrorMsg(null);
    const t = token || (await storage.getToken());
    if (!t) {
      setErrorMsg('Session expirée. Reconnectez-vous.');
      setSubmitting(false);
      return;
    }
    try {
      const res = await api.orderVirtualCard(t, brand, pin);
      if (res.success) {
        setStep('success');
      } else {
        setErrorMsg(res.message || 'Erreur lors de la commande.');
      }
    } catch (e) {
      setErrorMsg(e.message || 'Erreur réseau.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  if (!kycValid) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <LinearGradient colors={[colors.primary, '#3d0f5c']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <FontAwesome5 name="arrow-left" size={ICON_SIZE} color={colors.tertiary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Carte virtuelle</Text>
            <View style={styles.headerSpacer} />
          </LinearGradient>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <FontAwesome5 name="id-card" size={32} color={colors.secondary} />
            </View>
            <Text style={styles.cardTitle}>KYC requis</Text>
            <Text style={styles.cardSub}>
              Complétez votre vérification d'identité (KYC) avant de commander une carte virtuelle. Allez dans Paramètres puis KYC.
            </Text>
            <TouchableOpacity style={styles.cta} onPress={goToKyc} activeOpacity={0.85}>
              <Text style={styles.ctaText}>Compléter mon KYC</Text>
              <FontAwesome5 name="arrow-right" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.linkBtnText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (hasVirtualCard && virtualCard) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <LinearGradient colors={[colors.primary, '#3d0f5c']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <FontAwesome5 name="arrow-left" size={ICON_SIZE} color={colors.tertiary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Carte virtuelle</Text>
            <View style={styles.headerSpacer} />
          </LinearGradient>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <FontAwesome5 name="credit-card" size={32} color={colors.secondary} />
            </View>
            <Text style={styles.cardTitle}>Vous avez déjà une carte virtuelle</Text>
            <Text style={styles.cardSub}>
              {virtualCard.brand || 'Carte'} •••• {virtualCard.last4 || virtualCard.last_four}
            </Text>
            <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.linkBtnText}>Retour à l'accueil</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={[colors.primary, '#3d0f5c']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (step === 'brand' || step === 'need_mobile_money' || step === 'confirm' || step === 'pin') {
                if (step === 'pin') setStep('confirm');
                else if (step === 'confirm' || step === 'need_mobile_money') setStep('brand');
                else setStep('overview');
                setErrorMsg(null);
              } else {
                navigation.goBack();
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <FontAwesome5 name="arrow-left" size={ICON_SIZE} color={colors.tertiary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Carte virtuelle</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {step === 'overview' && (
              <View style={styles.card}>
                <View style={styles.iconWrap}>
                  <FontAwesome5 name="credit-card" size={32} color={colors.secondary} />
                </View>
                <Text style={styles.cardTitle}>Carte virtuelle RIPA</Text>
                <Text style={styles.cardSub}>
                  Obtenez une carte virtuelle Visa ou Mastercard pour vos paiements en ligne. Coût : 1 $ (prélevé sur votre Mobile Money).
                </Text>
                <TouchableOpacity style={styles.cta} onPress={() => { setStep('brand'); setErrorMsg(null); }} activeOpacity={0.85}>
                  <Text style={styles.ctaText}>Commander une carte virtuelle</Text>
                  <FontAwesome5 name="arrow-right" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.goBack()}>
                  <Text style={styles.linkBtnText}>Retour</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'brand' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Choisissez votre carte</Text>
                <Text style={styles.cardSub}>Visa ou Mastercard — 1 $ sera prélevé sur votre Mobile Money.</Text>
                <TouchableOpacity style={[styles.brandBtn, brand === 'visa' && styles.brandBtnActive]} onPress={() => onChooseBrand('visa')} activeOpacity={0.85}>
                  <FontAwesome5 name="cc-visa" size={28} color={brand === 'visa' ? colors.tertiary : colors.primary} />
                  <Text style={[styles.brandBtnText, brand === 'visa' && styles.brandBtnTextActive]}>Visa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.brandBtn, brand === 'mastercard' && styles.brandBtnActive]} onPress={() => onChooseBrand('mastercard')} activeOpacity={0.85}>
                  <FontAwesome5 name="cc-mastercard" size={28} color={brand === 'mastercard' ? colors.tertiary : colors.primary} />
                  <Text style={[styles.brandBtnText, brand === 'mastercard' && styles.brandBtnTextActive]}>Mastercard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkBtn} onPress={() => setStep('overview')}>
                  <Text style={styles.linkBtnText}>Retour</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'need_mobile_money' && (
              <View style={styles.card}>
                <View style={styles.iconWrap}>
                  <FontAwesome5 name="mobile-alt" size={32} color={colors.secondary} />
                </View>
                <Text style={styles.cardTitle}>Compte Mobile Money requis</Text>
                <Text style={styles.cardSub}>
                  Enregistrez au moins un compte Mobile Money pour que le montant de 1 $ soit prélevé lors de la commande.
                </Text>
                <TouchableOpacity style={styles.cta} onPress={goToAddMobileMoney} activeOpacity={0.85}>
                  <Text style={styles.ctaText}>Enregistrer un compte Mobile Money</Text>
                  <FontAwesome5 name="arrow-right" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkBtn} onPress={() => setStep('brand')}>
                  <Text style={styles.linkBtnText}>Retour au choix de carte</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'confirm' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Confirmer la commande</Text>
                <Text style={styles.cardSub}>
                  Carte {brand === 'visa' ? 'Visa' : 'Mastercard'} — 1 $ sera prélevé sur votre Mobile Money.
                </Text>
                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
                <TouchableOpacity style={styles.cta} onPress={onConfirmAndPay} activeOpacity={0.85}>
                  <Text style={styles.ctaText}>Confirmer et payer 1 $</Text>
                  <FontAwesome5 name="lock" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkBtn} onPress={() => setStep('brand')}>
                  <Text style={styles.linkBtnText}>Changer de type de carte</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'pin' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Entrez votre PIN</Text>
                <Text style={styles.cardSub}>Code PIN à 5 chiffres pour valider le prélèvement de 1 $.</Text>
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
                <TouchableOpacity style={[styles.cta, (!pinOk || submitting) && styles.ctaDisabled]} onPress={onSubmit} disabled={!pinOk || submitting} activeOpacity={0.85}>
                  {submitting ? <ActivityIndicator color={colors.tertiary} /> : (
                    <>
                      <Text style={styles.ctaText}>Valider le paiement</Text>
                      <FontAwesome5 name="check" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkBtn} onPress={() => { setStep('confirm'); setPin(''); setErrorMsg(null); }}>
                  <Text style={styles.linkBtnText}>Retour</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'success' && (
              <View style={styles.card}>
                <View style={styles.successIconWrap}>
                  <FontAwesome5 name="check-circle" size={48} color="#2E7D32" />
                </View>
                <Text style={styles.successTitle}>Carte virtuelle commandée</Text>
                <Text style={styles.cardSub}>1 $ a été prélevé sur votre Mobile Money. Votre carte virtuelle est disponible dans Mes cartes.</Text>
                <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('Home')} activeOpacity={0.85}>
                  <Text style={styles.ctaText}>Retour à l'accueil</Text>
                  <FontAwesome5 name="home" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
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
  loadingWrap: { flex: 1, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.tertiary, marginTop: 12 },
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
  brandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.secondary,
    marginBottom: 12,
  },
  brandBtnActive: { backgroundColor: colors.secondary },
  brandBtnText: { color: colors.primary, fontSize: 17, fontWeight: 'bold', marginLeft: 12 },
  brandBtnTextActive: { color: colors.tertiary },
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
  successIconWrap: { alignItems: 'center', marginBottom: 16 },
  successTitle: { color: '#2E7D32', fontSize: 22, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
});
