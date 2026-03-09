/**
 * Détail d'une carte enregistrée (PCI DSS : affichage minimal — last4, marque, expiration).
 * CTA : Faire un paiement avec cette carte. Carte virtuelle : Recharger (MM→carte), Retirer (carte→MM). Supprimer la carte avec confirmation PIN.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/theme';
import { useApi } from '../context/ApiContext';
import * as api from '../services/api';
import * as storage from '../services/storage';

const ICON_SIZE = 20;

export function CardDetailScreen({ route, navigation }) {
  const { cardId, last4, brand, type } = route.params || {};
  const { token } = useApi();
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [mmAccounts, setMmAccounts] = useState([]);
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txMode, setTxMode] = useState('recharge');
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [amount, setAmount] = useState('');
  const [txPin, setTxPin] = useState('');
  const [txError, setTxError] = useState(null);
  const [txSubmitting, setTxSubmitting] = useState(false);
  const [balance, setBalance] = useState(null);

  const isVirtual = (type || '').toLowerCase() === 'virtual' || type === 'virtual_card';
  const displayBrand = brand || 'Carte';
  const pinOk = pin.length === 5 && /^[0-9]+$/.test(pin);
  const amountNum = parseFloat(amount.replace(',', '.')) || 0;
  const txPinOk = txPin.length === 5 && /^[0-9]+$/.test(txPin);
  const txFormOk = selectedAccountId && amountNum > 0 && txPinOk;

  useEffect(() => {
    if (!isVirtual) return;
    let cancelled = false;
    (async () => {
      const t = token || (await storage.getToken());
      if (!t) return;
      try {
        const res = await api.getAccounts(t);
        if (!cancelled && res?.data?.accounts) setMmAccounts(res.data.accounts);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [isVirtual, token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = token || (await storage.getToken());
      if (!t) return;
      try {
        const res = await api.getCards(t);
        if (!cancelled && res?.data?.cards) {
          const card = res.data.cards.find((c) => String(c.id) === String(cardId));
          if (card && card.balance != null) setBalance(Number(card.balance));
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [cardId, token]);

  const openTxModal = (mode) => {
    setTxMode(mode);
    setSelectedAccountId(mmAccounts.length ? mmAccounts[0].id : null);
    setAmount('');
    setTxPin('');
    setTxError(null);
    setTxModalVisible(true);
  };

  const confirmTx = async () => {
    if (!txFormOk) {
      if (!selectedAccountId) setTxError('Choisissez un compte Mobile Money');
      else if (amountNum <= 0) setTxError('Montant invalide');
      else setTxError('PIN à 5 chiffres requis');
      return;
    }
    setTxSubmitting(true);
    setTxError(null);
    const t = token || (await storage.getToken());
    if (!t) {
      setTxError('Session expirée');
      setTxSubmitting(false);
      return;
    }
    try {
      if (txMode === 'recharge') {
        const res = await api.cardRecharge(t, Number(cardId), selectedAccountId, amountNum, txPin);
        if (res?.data?.balance != null) setBalance(Number(res.data.balance));
        Alert.alert('Succès', 'Carte rechargée (simulation Onafriq).');
      } else {
        const res = await api.cardWithdraw(t, Number(cardId), selectedAccountId, amountNum, txPin);
        if (res?.data?.balance != null) setBalance(Number(res.data.balance));
        Alert.alert('Succès', 'Retrait vers Mobile Money effectué (simulation Onafriq).');
      }
      setTxModalVisible(false);
    } catch (e) {
      setTxError(e.message || 'Erreur');
    } finally {
      setTxSubmitting(false);
    }
  };

  const onPayWithCard = () => {
    navigation.navigate('Home');
  };

  const onDeletePress = () => {
    Alert.alert(
      'Supprimer cette carte',
      'La carte sera retirée de vos moyens de paiement. Confirmez avec votre PIN.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => { setPin(''); setPinError(null); setPinModalVisible(true); } },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!pinOk) {
      setPinError('PIN invalide (5 chiffres)');
      return;
    }
    setSubmitting(true);
    setPinError(null);
    const t = token || (await storage.getToken());
    if (!t) {
      setPinError('Session expirée');
      setSubmitting(false);
      return;
    }
    try {
      await api.deleteCard(t, Number(cardId), pin);
      setPinModalVisible(false);
      navigation.navigate('Home');
    } catch (e) {
      setPinError(e.message || 'Erreur');
    } finally {
      setSubmitting(false);
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
          <Text style={styles.headerTitle}>Détail de la carte</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          <View style={styles.cardVisual}>
            <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.cardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.cardTop}>
                <View style={styles.chip} />
                <Text style={styles.cardBrand}>{displayBrand}</Text>
              </View>
              {isVirtual && balance != null ? (
                <View style={styles.balanceBlock}>
                  <Text style={styles.balanceLabel}>Solde disponible</Text>
                  <Text style={styles.balanceAmount}>{Number(balance).toFixed(2)} $</Text>
                </View>
              ) : null}
              <Text style={styles.cardPan}>•••• •••• •••• {last4 || '****'}</Text>
              <Text style={styles.cardType}>{isVirtual ? 'Carte virtuelle' : 'Carte bancaire'}</Text>
            </LinearGradient>
          </View>

          <View style={styles.infoBlock}>
            <View style={styles.infoRow}>
              <FontAwesome5 name="credit-card" size={18} color={colors.primary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Numéro masqué (PCI DSS)</Text>
              <Text style={styles.infoValue}>•••• {last4 || '****'}</Text>
            </View>
            <View style={styles.infoRow}>
              <FontAwesome5 name="tag" size={18} color={colors.primary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Marque</Text>
              <Text style={styles.infoValue}>{displayBrand}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.cta} onPress={onPayWithCard} activeOpacity={0.85}>
            <FontAwesome5 name="hand-holding-usd" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
            <Text style={styles.ctaText}>Faire un paiement avec cette carte</Text>
          </TouchableOpacity>

          {isVirtual && mmAccounts.length > 0 ? (
            <>
              <TouchableOpacity style={styles.ctaSecondary} onPress={() => openTxModal('recharge')} activeOpacity={0.85}>
                <FontAwesome5 name="mobile-alt" size={ICON_SIZE} color={colors.primary} style={styles.ctaIcon} />
                <Text style={styles.ctaSecondaryText}>Recharger la carte depuis Mobile Money</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctaSecondary} onPress={() => openTxModal('withdraw')} activeOpacity={0.85}>
                <FontAwesome5 name="wallet" size={ICON_SIZE} color={colors.primary} style={styles.ctaIcon} />
                <Text style={styles.ctaSecondaryText}>Retirer vers Mobile Money</Text>
              </TouchableOpacity>
            </>
          ) : null}

          <TouchableOpacity style={styles.deleteBtn} onPress={onDeletePress} activeOpacity={0.85}>
            <FontAwesome5 name="trash-alt" size={18} color="#c62828" style={styles.deleteBtnIcon} />
            <Text style={styles.deleteBtnText}>Supprimer cette carte</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={pinModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Confirmer avec votre PIN</Text>
            <Text style={styles.modalSub}>Entrez votre code PIN à 5 chiffres pour supprimer cette carte.</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="•••••"
              placeholderTextColor="rgba(0,0,0,0.4)"
              value={pin}
              onChangeText={(t) => { setPin(t.replace(/\D/g, '').slice(0, 5)); setPinError(null); }}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={5}
            />
            {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setPinModalVisible(false)} disabled={submitting}>
                <Text style={styles.modalBtnSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnPrimary, (!pinOk || submitting) && styles.ctaDisabled]} onPress={confirmDelete} disabled={!pinOk || submitting}>
                {submitting ? <ActivityIndicator color={colors.tertiary} size="small" /> : <Text style={styles.modalBtnPrimaryText}>Supprimer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={txModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.txModalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {txMode === 'recharge' ? 'Recharger la carte' : 'Retirer vers Mobile Money'}
              </Text>
              <Text style={styles.modalSub}>
                {txMode === 'recharge' ? 'Choisissez le compte Mobile Money à débiter et le montant.' : 'Choisissez le compte Mobile Money à créditer et le montant.'}
              </Text>
              <Text style={styles.txFieldLabel}>Compte Mobile Money</Text>
              {mmAccounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.txAccountItem, selectedAccountId === acc.id && styles.txAccountItemSelected]}
                  onPress={() => setSelectedAccountId(acc.id)}
                  activeOpacity={0.8}
                >
                  <FontAwesome5 name="mobile-alt" size={16} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={styles.txAccountText}>{acc.number_masked || `Compte #${acc.id}`}</Text>
                  {selectedAccountId === acc.id ? <FontAwesome5 name="check-circle" size={18} color={colors.secondary} /> : null}
                </TouchableOpacity>
              ))}
              <Text style={styles.txFieldLabel}>Montant ($)</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="rgba(0,0,0,0.4)"
                value={amount}
                onChangeText={(t) => { setAmount(t.replace(/[^0-9.,]/g, '').replace(',', '.')); setTxError(null); }}
                keyboardType="decimal-pad"
              />
              <Text style={styles.txFieldLabel}>PIN (5 chiffres)</Text>
              <TextInput
                style={styles.pinInput}
                placeholder="•••••"
                placeholderTextColor="rgba(0,0,0,0.4)"
                value={txPin}
                onChangeText={(t) => { setTxPin(t.replace(/\D/g, '').slice(0, 5)); setTxError(null); }}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={5}
              />
              {txError ? <Text style={styles.pinError}>{txError}</Text> : null}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setTxModalVisible(false)} disabled={txSubmitting}>
                  <Text style={styles.modalBtnSecondaryText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.ctaTxConfirm, (!txFormOk || txSubmitting) && styles.ctaDisabled]} onPress={confirmTx} disabled={!txFormOk || txSubmitting}>
                  {txSubmitting ? <ActivityIndicator color={colors.tertiary} size="small" /> : <Text style={styles.ctaTxConfirmText}>{txMode === 'recharge' ? 'Recharger' : 'Retirer'}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFC' },
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
  content: { flex: 1 },
  contentInner: { padding: 20, paddingBottom: 40 },
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
  cardGradient: {
    padding: 24,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { width: 40, height: 30, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.25)' },
  cardBrand: { color: colors.tertiary, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  balanceBlock: { marginVertical: 12 },
  balanceLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 2 },
  balanceAmount: { color: colors.tertiary, fontSize: 28, fontWeight: 'bold' },
  cardPan: { color: colors.tertiary, fontSize: 22, letterSpacing: 3 },
  cardType: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  infoBlock: {
    backgroundColor: colors.tertiary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  infoIcon: { marginRight: 12, width: 22 },
  infoLabel: { flex: 1, color: '#6B6B6B', fontSize: 14 },
  infoValue: { color: colors.fourth, fontSize: 15, fontWeight: '600' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaIcon: { marginRight: 12 },
  ctaText: { color: colors.tertiary, fontSize: 17, fontWeight: 'bold' },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(165,154,247,0.12)',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(165,154,247,0.4)',
  },
  ctaSecondaryText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#c62828',
    backgroundColor: 'transparent',
  },
  deleteBtnIcon: { marginRight: 10 },
  deleteBtnText: { color: '#c62828', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: colors.tertiary, borderRadius: 20, padding: 24 },
  modalTitle: { color: colors.fourth, fontSize: 18, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' },
  modalSub: { color: '#6B6B6B', fontSize: 14, marginBottom: 20, textAlign: 'center' },
  pinInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 18,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: 8,
  },
  pinError: { color: '#c62828', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  modalBtnSecondary: { paddingVertical: 12, paddingHorizontal: 20 },
  modalBtnSecondaryText: { color: '#6B6B6B', fontSize: 16, fontWeight: '600' },
  modalBtnPrimary: {
    backgroundColor: '#c62828',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  modalBtnPrimaryText: { color: colors.tertiary, fontSize: 16, fontWeight: 'bold' },
  ctaDisabled: { opacity: 0.6 },
  txModalScroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  txFieldLabel: { color: '#6B6B6B', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  txAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    marginBottom: 8,
  },
  txAccountItemSelected: { backgroundColor: 'rgba(165,154,247,0.2)', borderWidth: 2, borderColor: colors.primary },
  txAccountText: { flex: 1, color: colors.fourth, fontSize: 15, fontWeight: '600' },
  amountInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    marginBottom: 8,
  },
  ctaTxConfirm: {
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  ctaTxConfirmText: { color: colors.tertiary, fontSize: 16, fontWeight: 'bold' },
});
