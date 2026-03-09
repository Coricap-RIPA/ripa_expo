/**
 * Écran Comptes : liste Mobile Money + Comptes bancaires
 * Modifier / Supprimer avec confirmation PIN.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
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

export function AccountsScreen({ navigation }) {
  const { token } = useApi();
  const [mobileAccounts, setMobileAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinModal, setPinModal] = useState({ visible: false, action: null, payload: null });
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editBankModal, setEditBankModal] = useState({ visible: false, account: null, nom_banque: '', num_compte: '' });

  const fetchAll = useCallback(async () => {
    const t = token || (await storage.getToken());
    if (!t) return;
    try {
      const [mmRes, bankRes] = await Promise.all([
        api.getAccounts(t),
        api.getBankAccounts(t),
      ]);
      setMobileAccounts((mmRes.success && mmRes.data?.accounts) ? mmRes.data.accounts : []);
      setBankAccounts((bankRes.success && bankRes.data?.accounts) ? bankRes.data.accounts : []);
    } catch (e) {
      setMobileAccounts([]);
      setBankAccounts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const askPin = (action, payload) => {
    setPin('');
    setPinError(null);
    setPinModal({ visible: true, action, payload });
  };

  const closePinModal = () => {
    setPinModal({ visible: false, action: null, payload: null });
    setPin('');
    setPinError(null);
  };

  const confirmPin = async () => {
    const p = pin.trim();
    if (p.length !== 5 || !/^[0-9]{5}$/.test(p)) {
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
    const { action, payload } = pinModal;
    try {
      if (action === 'delete_mobile') {
        await api.deleteAccount(t, payload.id, p);
        setMobileAccounts((prev) => prev.filter((a) => a.id !== payload.id));
      } else if (action === 'update_mobile_default') {
        await api.updateAccount(t, payload.id, true, p);
        setMobileAccounts((prev) => prev.map((a) => ({ ...a, is_default: a.id === payload.id })));
      } else if (action === 'delete_bank') {
        await api.deleteBankAccount(t, payload.id, p);
        setBankAccounts((prev) => prev.filter((a) => a.id !== payload.id));
      } else if (action === 'update_bank') {
        await api.updateBankAccount(t, payload.id, { nom_banque: payload.nom_banque, num_compte: payload.num_compte || undefined }, p);
        await fetchAll();
        setEditBankModal({ visible: false, account: null, nom_banque: '', num_compte: '' });
      }
      closePinModal();
    } catch (e) {
      setPinError(e.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteMobile = (acc) => {
    Alert.alert('Supprimer ce compte', 'Confirmez avec votre PIN pour supprimer ce compte Mobile Money.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => askPin('delete_mobile', { id: acc.id }) },
    ]);
  };

  const onSetDefaultMobile = (acc) => {
    if (acc.is_default) return;
    askPin('update_mobile_default', { id: acc.id });
  };

  const onDeleteBank = (acc) => {
    Alert.alert('Supprimer ce compte', 'Confirmez avec votre PIN pour supprimer ce compte bancaire.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => askPin('delete_bank', { id: acc.id }) },
    ]);
  };

  const onEditBank = (acc) => {
    setEditBankModal({ visible: true, account: acc, nom_banque: acc.nom_banque || '', num_compte: '' });
  };

  const saveEditBank = () => {
    const { account, nom_banque, num_compte } = editBankModal;
    if (!nom_banque.trim()) return;
    askPin('update_bank', { id: account.id, nom_banque: nom_banque.trim(), num_compte: num_compte.trim() || undefined });
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={[colors.primary, '#3d0f5c']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <FontAwesome5 name="arrow-left" size={ICON_SIZE} color={colors.tertiary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes comptes</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        >
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.secondary} />
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <FontAwesome5 name="mobile-alt" size={18} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Mobile Money</Text>
                </View>
                {mobileAccounts.length === 0 ? (
                  <Text style={styles.emptyText}>Aucun compte Mobile Money</Text>
                ) : (
                  mobileAccounts.map((acc) => (
                    <View key={acc.id} style={styles.row}>
                      <View style={styles.rowIconWrap}>
                        <FontAwesome5 name="mobile-alt" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowLabel}>{acc.number_masked}</Text>
                        {acc.is_default ? <Text style={styles.rowBadge}>Par défaut</Text> : null}
                      </View>
                      <View style={styles.rowActions}>
                        {!acc.is_default && (
                          <TouchableOpacity style={styles.rowBtn} onPress={() => onSetDefaultMobile(acc)}>
                            <FontAwesome5 name="star" size={14} color={colors.secondary} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.rowBtnDanger} onPress={() => onDeleteMobile(acc)}>
                          <FontAwesome5 name="trash-alt" size={14} color="#c62828" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddMobileMoney')} activeOpacity={0.85}>
                  <FontAwesome5 name="plus" size={16} color={colors.secondary} />
                  <Text style={styles.addBtnText}>Ajouter un compte Mobile Money</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <FontAwesome5 name="university" size={18} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Comptes bancaires</Text>
                </View>
                {bankAccounts.length === 0 ? (
                  <Text style={styles.emptyText}>Aucun compte bancaire</Text>
                ) : (
                  bankAccounts.map((acc) => (
                    <View key={acc.id} style={styles.row}>
                      <View style={styles.rowIconWrap}>
                        <FontAwesome5 name="university" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowLabel}>{acc.nom_banque}</Text>
                        <Text style={styles.rowSub}>{acc.number_masked}</Text>
                      </View>
                      <View style={styles.rowActions}>
                        <TouchableOpacity style={styles.rowBtn} onPress={() => onEditBank(acc)}>
                          <FontAwesome5 name="pen" size={14} color={colors.secondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rowBtnDanger} onPress={() => onDeleteBank(acc)}>
                          <FontAwesome5 name="trash-alt" size={14} color="#c62828" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddBankAccount')} activeOpacity={0.85}>
                  <FontAwesome5 name="plus" size={16} color={colors.secondary} />
                  <Text style={styles.addBtnText}>Ajouter un compte bancaire</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={pinModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Confirmer avec votre PIN</Text>
            <Text style={styles.modalSub}>Entrez votre code PIN à 5 chiffres</Text>
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
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={closePinModal} disabled={submitting}>
                <Text style={styles.modalBtnSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnPrimary, submitting && styles.ctaDisabled]} onPress={confirmPin} disabled={submitting}>
                {submitting ? <ActivityIndicator color={colors.tertiary} size="small" /> : <Text style={styles.modalBtnPrimaryText}>Confirmer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editBankModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Modifier le compte</Text>
            <Text style={styles.modalSub}>Modifiez les champs puis confirmez avec votre PIN</Text>
            <Text style={styles.inputLabel}>Nom de la banque</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: BIC, Equity Bank..."
              placeholderTextColor="rgba(0,0,0,0.4)"
              value={editBankModal.nom_banque}
              onChangeText={(v) => setEditBankModal((prev) => ({ ...prev, nom_banque: v }))}
            />
            <Text style={styles.inputLabel}>Numéro de compte / IBAN (optionnel)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Laisser vide pour ne pas modifier"
              placeholderTextColor="rgba(0,0,0,0.4)"
              value={editBankModal.num_compte}
              onChangeText={(v) => setEditBankModal((prev) => ({ ...prev, num_compte: v }))}
              keyboardType="default"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setEditBankModal({ visible: false, account: null, nom_banque: '', num_compte: '' })}>
                <Text style={styles.modalBtnSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={saveEditBank} disabled={!editBankModal.nom_banque.trim()}>
                <Text style={styles.modalBtnPrimaryText}>Enregistrer (PIN)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingWrap: { padding: 40, alignItems: 'center' },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: colors.fourth, fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  emptyText: { color: '#6B6B6B', fontSize: 14, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tertiary,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8E0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowBody: { flex: 1 },
  rowLabel: { color: colors.fourth, fontSize: 15, fontWeight: '600' },
  rowSub: { color: '#6B6B6B', fontSize: 13, marginTop: 2 },
  rowBadge: { color: colors.secondary, fontSize: 12, fontWeight: '600', marginTop: 4 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBtn: { padding: 8 },
  rowBtnDanger: { padding: 8 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.secondary,
    borderStyle: 'dashed',
  },
  addBtnText: { color: colors.secondary, fontSize: 15, fontWeight: '600', marginLeft: 8 },

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
  inputLabel: { color: colors.fourth, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  textInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  modalBtnSecondary: { paddingVertical: 12, paddingHorizontal: 20 },
  modalBtnSecondaryText: { color: '#6B6B6B', fontSize: 16, fontWeight: '600' },
  modalBtnPrimary: {
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  modalBtnPrimaryText: { color: colors.tertiary, fontSize: 16, fontWeight: 'bold' },
  ctaDisabled: { opacity: 0.6 },
});
