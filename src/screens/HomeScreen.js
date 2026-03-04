/**
 * Écran d'accueil (utilisateur connecté)
 * Design fintech : header avec logo, carte active ou placeholder (+),
 * moyens de paiement, ergonomie et hiérarchie claire.
 */
import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  ActionSheetIOS,
  Platform,
  Alert,
  Modal,
  Pressable,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/theme';
import { logos } from '../constants/assets';
import { useApi } from '../context/ApiContext';
import * as api from '../services/api';

const CARD_PLACEHOLDER_HEIGHT = 160;
const STRIP_WIDTH_PERCENT = '15%';
/** Couleur claire (plus claire que la secondaire) pour la première bande */
const STRIP_LIGHT_COLOR = '#E8E4F8';

/**
 * RÈGLE MÉTIER moyens de paiement (à respecter dans AddMobileMoney, OrderVirtualCard, RegisterCard + backend) :
 * - Mobile Money : un ou plusieurs comptes autorisés.
 * - Carte virtuelle : une seule autorisée.
 * - Carte bancaire (physique) : une seule autorisée.
 */
const PAYMENT_ADD_OPTIONS = [
  { type: 'mobile_money', label: 'Mobile Money', sub: 'Airtel, Orange, M-Pesa…', icon: 'mobile-alt', iconBg: '#E8E0FF', screen: 'AddMobileMoney' },
  { type: 'virtual_card', label: 'Carte virtuelle', sub: 'Visa / Mastercard', icon: 'credit-card', iconBg: '#F0EDFF', screen: 'OrderVirtualCard' },
  { type: 'physical_card', label: 'Carte bancaire', sub: 'Lier une carte', icon: 'wallet', iconBg: '#E8E0FF', screen: 'RegisterCard' },
];

const MENU_OPTIONS = [
  { key: 'profile', label: 'Mon profil', icon: 'user', screen: null },
  { key: 'help', label: 'Aide', icon: 'question-circle', screen: null },
  { key: 'settings', label: 'Paramètres', icon: 'cog', screen: 'Settings' },
  { key: 'kyc', label: 'KYC', icon: 'id-card', screen: 'Kyc' },
  { key: 'logout', label: 'Déconnexion', icon: 'sign-out-alt', action: 'logout' },
  { key: 'exitApp', label: 'Sortir de l\'application', icon: 'power-off', action: 'exitApp' },
];

export function HomeScreen({ navigation }) {
  const { logout, token } = useApi();
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeCard] = useState(null);
  const [recentTransactions] = useState([]);
  const [recentContacts] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  /** Moyens enregistrés : { id, type: 'mobile_money'|'virtual_card'|'physical_card', label?, sub? } — règle : 1+ mobile, 1 virtuelle, 1 physique */
  const [paymentMethods, setPaymentMethods] = useState([]);

  const loadPaymentMethods = useCallback(async () => {
    if (!token) return;
    setLoadingPaymentMethods(true);
    try {
      const [accountsRes, cardsRes] = await Promise.all([
        api.getAccounts(token),
        api.getCards(token),
      ]);
      const list = [];
      const accounts = accountsRes?.data?.accounts ?? [];
      accounts.forEach((acc) => {
        list.push({
          id: String(acc.id),
          type: 'mobile_money',
          label: acc.number_masked || 'Mobile Money',
          sub: 'Mobile Money',
        });
      });
      const cards = cardsRes?.data?.cards ?? [];
      cards.forEach((c) => {
        const isVirtual = (c.type || '').toLowerCase() === 'virtual';
        list.push({
          id: String(c.id),
          type: isVirtual ? 'virtual_card' : 'physical_card',
          label: `•••• ${c.last4 || '****'}`,
          sub: c.brand || 'Carte',
        });
      });
      setPaymentMethods(list);
    } catch (_) {
      setPaymentMethods([]);
    } finally {
      setLoadingPaymentMethods(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadPaymentMethods();
    }, [loadPaymentMethods])
  );

  const hasVirtualCard = paymentMethods.some((p) => p.type === 'virtual_card');
  const hasPhysicalCard = paymentMethods.some((p) => p.type === 'physical_card');
  const mobileMoneyCount = paymentMethods.filter((p) => p.type === 'mobile_money').length;
  const addOptionsToShow = [
    PAYMENT_ADD_OPTIONS.find((o) => o.type === 'mobile_money'),
    ...(hasVirtualCard ? [] : [PAYMENT_ADD_OPTIONS.find((o) => o.type === 'virtual_card')]),
    ...(hasPhysicalCard ? [] : [PAYMENT_ADD_OPTIONS.find((o) => o.type === 'physical_card')]),
  ].filter(Boolean);
  const isEmpty = paymentMethods.length === 0;

  const renderAddCardIndicator = (opt) => {
    if (opt.type !== 'mobile_money' || mobileMoneyCount === 0) return null;
    return (
      <View style={styles.pmCardAddIndicator}>
        <FontAwesome5 name="check-circle" size={12} color={colors.secondary} style={styles.pmCardAddIndicatorIcon} />
        <Text style={styles.pmCardAddIndicatorText}>
          {mobileMoneyCount === 1 ? '1 compte enregistré' : `${mobileMoneyCount} comptes enregistrés`}
        </Text>
      </View>
    );
  };

  const onExitApp = () => {
    setMenuVisible(false);
    Alert.alert(
      'Sortir de l\'application',
      'Voulez-vous quitter RIPA ? Votre session restera enregistrée.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS === 'android') {
              BackHandler.exitApp();
            } else {
              Alert.alert('Information', 'Sur iPhone, fermez l\'application depuis le gestionnaire d\'applications (double-clic sur le bouton d\'accueil ou balayage).');
            }
          },
        },
      ]
    );
  };

  const onMenuOption = (opt) => {
    setMenuVisible(false);
    if (opt.action === 'logout') {
      logout();
      return;
    }
    if (opt.action === 'exitApp') {
      onExitApp();
      return;
    }
    if (opt.screen) navigation.navigate(opt.screen);
  };

  const onAddCardPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Commander une carte virtuelle', 'Enregistrer une carte'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) navigation.navigate('OrderVirtualCard');
          if (buttonIndex === 2) navigation.navigate('RegisterCard');
        }
      );
    } else {
      Alert.alert(
        'Ajouter une carte',
        undefined,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Carte virtuelle', onPress: () => navigation.navigate('OrderVirtualCard') },
          { text: 'Carte bancaire', onPress: () => navigation.navigate('RegisterCard') },
        ]
      );
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[colors.primary, '#3d0f5c']}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerRow}>
              <Image
                source={logos.onDark}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <View style={styles.headerSpacer} />
              <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                style={styles.menuBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="ellipsis-v" size={15} color="rgba(255,255,255,0.92)" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <Modal visible={menuVisible} transparent animationType="fade">
            <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
              <View style={styles.menuBox}>
                {MENU_OPTIONS.map((opt, index) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.menuItem, index === MENU_OPTIONS.length - 1 && styles.menuItemLast]}
                    onPress={() => onMenuOption(opt)}
                    activeOpacity={0.7}
                  >
                    <FontAwesome5 name={opt.icon} size={18} color={colors.primary} style={styles.menuItemIcon} />
                    <Text style={styles.menuItemText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Pressable>
          </Modal>

          {/* Carte active ou placeholder */}
          <View style={styles.cardSection}>
            {activeCard ? (
              <View style={styles.bankCard}>
                <View style={styles.bankCardTop}>
                  <View style={styles.chip} />
                  <Text style={styles.bankCardBrand}>{activeCard.brand || 'VISA'}</Text>
                </View>
                <Text style={styles.bankCardPan}>•••• •••• •••• {activeCard.last4}</Text>
                <View style={styles.bankCardBottom}>
                  <View>
                    <Text style={styles.bankCardLabel}>Expiration</Text>
                    <Text style={styles.bankCardValue}>{activeCard.expiry || '••/••'}</Text>
                  </View>
                  <View style={styles.bankCardCvv}>
                    <Text style={styles.bankCardLabel}>CVV</Text>
                    <Text style={styles.bankCardValue}>•••</Text>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.placeholderCard} onPress={onAddCardPress} activeOpacity={0.85}>
                <View style={[styles.placeholderCardStrip, styles.placeholderCardStripLight]} />
                <View style={[styles.placeholderCardStrip, styles.placeholderCardStripSecondary]} />
                <LinearGradient
                  colors={['#3d2c5c', '#2a1845']}
                  style={styles.placeholderCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.placeholderPlusWrap}>
                    <FontAwesome5 name="plus" size={32} color="rgba(255,255,255,0.9)" />
                  </View>
                  <Text style={styles.placeholderCardText}>Ajouter une carte</Text>
                  <Text style={styles.placeholderCardSub}>Virtuelle ou bancaire</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Moyens de paiement (au-dessus de Récentes transactions) — défilement horizontal */}
          <View style={styles.paymentSection}>
            <View style={styles.paymentSectionHeader}>
              <FontAwesome5 name="wallet" size={18} color={colors.primary} style={styles.paymentSectionIcon} />
              <View>
                <Text style={styles.paymentSectionTitle}>Moyens de paiement</Text>
                <Text style={styles.paymentSectionSubtitle}>
                  {isEmpty ? 'Ajoutez un moyen pour payer et recevoir' : 'Vos moyens enregistrés'}
                </Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.paymentScrollContent}
            >
              {isEmpty ? (
                PAYMENT_ADD_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.type}
                    style={styles.pmCardAdd}
                    onPress={() => navigation.navigate(opt.screen)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.pmCardIconWrap, { backgroundColor: opt.iconBg }]}>
                      <FontAwesome5 name={opt.icon} size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.pmCardLabel}>{opt.label}</Text>
                    <Text style={styles.pmCardSub}>{opt.sub}</Text>
                    {renderAddCardIndicator(opt)}
                    <View style={styles.pmCardAddBadge}>
                      <FontAwesome5 name="plus" size={12} color={colors.tertiary} />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <>
                  {paymentMethods.map((pm) => (
                    <View key={pm.id} style={styles.pmCardRegistered}>
                      <View style={[styles.pmCardIconWrap, { backgroundColor: '#E8E0FF' }]}>
                        <FontAwesome5
                          name={pm.type === 'mobile_money' ? 'mobile-alt' : pm.type === 'virtual_card' ? 'credit-card' : 'wallet'}
                          size={22}
                          color={colors.primary}
                        />
                      </View>
                      <Text style={styles.pmCardLabel} numberOfLines={1}>{pm.label || (pm.type === 'mobile_money' ? 'Mobile Money' : pm.type === 'virtual_card' ? 'Carte virtuelle' : 'Carte bancaire')}</Text>
                      {pm.sub ? <Text style={styles.pmCardSub} numberOfLines={1}>{pm.sub}</Text> : null}
                    </View>
                  ))}
                  {addOptionsToShow.map((opt) => (
                    <TouchableOpacity
                      key={`add-${opt.type}`}
                      style={styles.pmCardAdd}
                      onPress={() => navigation.navigate(opt.screen)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.pmCardIconWrap, { backgroundColor: opt.iconBg }]}>
                        <FontAwesome5 name={opt.icon} size={24} color={colors.primary} />
                      </View>
                      <Text style={styles.pmCardLabel}>{opt.label}</Text>
                      <Text style={styles.pmCardSub}>{opt.sub}</Text>
                      {renderAddCardIndicator(opt)}
                      <View style={styles.pmCardAddBadge}>
                        <FontAwesome5 name="plus" size={12} color={colors.tertiary} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>

          {/* Contacts récents (transactions) */}
          <View style={styles.contactsSection}>
            <View style={styles.contactsSectionHeader}>
              <FontAwesome5 name="user-friends" size={18} color={colors.primary} style={styles.contactsSectionIcon} />
              <Text style={styles.contactsSectionTitle}>Contacts récents</Text>
            </View>
            {recentContacts.length === 0 ? (
              <View style={styles.contactsEmpty}>
                <FontAwesome5 name="user-friends" size={28} color="#B0B0B0" style={styles.contactsEmptyIcon} />
                <Text style={styles.contactsEmptyText}>Aucun contact récent</Text>
                <Text style={styles.contactsEmptySub}>Les personnes à qui vous avez envoyé de l’argent apparaîtront ici</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contactsScroll}>
                {recentContacts.map((c) => (
                  <TouchableOpacity key={c.id} style={styles.contactCard} activeOpacity={0.8}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>{(c.label || '?').charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.contactLabel} numberOfLines={1}>{c.label || 'Contact'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Récentes transactions */}
          <View style={styles.transactionsSection}>
            <View style={styles.transactionsSectionHeader}>
              <FontAwesome5 name="exchange-alt" size={18} color={colors.primary} style={styles.transactionsSectionIcon} />
              <Text style={styles.transactionsSectionTitle}>Récentes transactions</Text>
            </View>
            {recentTransactions.length === 0 ? (
              <View style={styles.transactionsEmpty}>
                <View style={styles.transactionsEmptyIconWrap}>
                  <FontAwesome5 name="receipt" size={32} color={colors.secondary} />
                </View>
                <Text style={styles.transactionsEmptyTitle}>Aucune transaction</Text>
                <Text style={styles.transactionsEmptySub}>Vos opérations récentes apparaîtront ici</Text>
              </View>
            ) : (
              <View style={styles.transactionsList}>
                {recentTransactions.slice(0, 10).map((tx, index) => (
                  <View key={tx.id || index} style={styles.transactionRow}>
                    <View style={[styles.transactionIconWrap, { backgroundColor: tx.type === 'credit' ? '#E8F5E9' : '#FFEBEE' }]}>
                      <FontAwesome5 name={tx.type === 'credit' ? 'arrow-down' : 'arrow-up'} size={14} color={tx.type === 'credit' ? '#2E7D32' : '#c62828'} />
                    </View>
                    <View style={styles.transactionBody}>
                      <Text style={styles.transactionLabel}>{tx.label || 'Transaction'}</Text>
                      <Text style={styles.transactionDate}>{tx.date || ''}</Text>
                    </View>
                    <Text style={[styles.transactionAmount, tx.type === 'credit' ? styles.transactionAmountCredit : styles.transactionAmountDebit]}>
                      {tx.type === 'credit' ? '+' : '-'}{tx.amount || '0'} $
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Section KYC */}
          <TouchableOpacity style={styles.kycSection} onPress={() => navigation.navigate('Kyc')} activeOpacity={0.85}>
            <View style={styles.kycSectionLeft}>
              <View style={styles.kycSectionIconWrap}>
                <FontAwesome5 name="id-card" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.kycSectionTitle}>Vérification d’identité (KYC)</Text>
                <Text style={styles.kycSectionSub}>Statut et prochaine échéance</Text>
              </View>
            </View>
            <FontAwesome5 name="chevron-right" size={16} color="#B0B0B0" />
          </TouchableOpacity>

          <View style={styles.footer}>
            <View style={styles.footerBadge}>
              <FontAwesome5 name="shield-alt" size={12} color={colors.secondary} />
              <Text style={styles.footerText}>Paiements sécurisés</Text>
            </View>
          </View>
        </ScrollView>

        {/* Floating action buttons */}
        <View style={styles.fabContainer}>
          <View style={styles.fabWrapper}>
            <TouchableOpacity
              style={styles.fab}
              onPress={() => {}}
              activeOpacity={0.85}
            >
              <FontAwesome5 name="plus" size={22} color={colors.tertiary} />
            </TouchableOpacity>
            <View style={styles.fabDivider} />
            <TouchableOpacity
              style={styles.fab}
              onPress={() => {}}
              activeOpacity={0.85}
            >
              <FontAwesome5 name="qrcode" size={22} color={colors.tertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFC' },
  container: { flex: 1, backgroundColor: '#FAFAFC' },
  content: { paddingBottom: 100 },
  header: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: {
    height: 48,
    width: 110,
  },
  headerSpacer: { flex: 1 },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 48,
    paddingRight: 14,
  },
  menuBox: {
    backgroundColor: colors.tertiary,
    borderRadius: 16,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  menuItemIcon: { marginRight: 14 },
  menuItemText: { color: colors.fourth, fontSize: 16, fontWeight: '600' },
  menuItemLast: { borderBottomWidth: 0 },
  cardSection: {
    marginHorizontal: 14,
    marginTop: 16,
    marginBottom: 2,
  },
  bankCard: {
    borderRadius: 20,
    padding: 22,
    minHeight: 160,
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  bankCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: {
    width: 40,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  bankCardBrand: { color: colors.tertiary, fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  bankCardPan: { color: colors.tertiary, fontSize: 20, letterSpacing: 3 },
  bankCardBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 24 },
  bankCardLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 2 },
  bankCardValue: { color: colors.tertiary, fontSize: 14, fontWeight: '600' },
  bankCardCvv: {},
  placeholderCard: {
    flexDirection: 'row',
    minHeight: CARD_PLACEHOLDER_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    backgroundColor: '#2a1845',
  },
  placeholderCardStrip: {
    width: STRIP_WIDTH_PERCENT,
    minHeight: CARD_PLACEHOLDER_HEIGHT,
  },
  placeholderCardStripLight: {
    backgroundColor: STRIP_LIGHT_COLOR,
  },
  placeholderCardStripSecondary: {
    backgroundColor: colors.secondary,
  },
  placeholderCardGradient: {
    flex: 1,
    minHeight: CARD_PLACEHOLDER_HEIGHT,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: 'rgba(165,154,247,0.35)',
    borderStyle: 'dashed',
  },
  placeholderPlusWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  placeholderCardText: { color: colors.tertiary, fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  placeholderCardSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  paymentSection: {
    marginHorizontal: 14,
    marginTop: 16,
  },
  paymentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentSectionIcon: { marginRight: 10 },
  paymentSectionTitle: { color: colors.fourth, fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  paymentSectionSubtitle: { color: '#6B6B6B', fontSize: 13 },
  paymentScrollContent: {
    paddingRight: 14,
  },
  pmCardAdd: {
    width: 148,
    backgroundColor: colors.tertiary,
    borderRadius: 18,
    padding: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(165,154,247,0.35)',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  pmCardRegistered: {
    width: 148,
    backgroundColor: colors.tertiary,
    borderRadius: 18,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  pmCardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pmCardLabel: { color: colors.fourth, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  pmCardSub: { color: '#6B6B6B', fontSize: 12, lineHeight: 16 },
  pmCardAddBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pmCardAddIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(165,154,247,0.14)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  pmCardAddIndicatorIcon: { marginRight: 6 },
  pmCardAddIndicatorText: { color: colors.primary, fontSize: 11, fontWeight: '600' },
  contactsSection: {
    marginHorizontal: 14,
    marginTop: 16,
    backgroundColor: colors.tertiary,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  contactsSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  contactsSectionIcon: { marginRight: 10 },
  contactsSectionTitle: { color: colors.fourth, fontSize: 18, fontWeight: 'bold' },
  contactsEmpty: { alignItems: 'center', paddingVertical: 20 },
  contactsEmptyIcon: { marginBottom: 10 },
  contactsEmptyText: { color: colors.fourth, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  contactsEmptySub: { color: '#6B6B6B', fontSize: 13 },
  contactsScroll: { paddingRight: 14 },
  contactCard: {
    width: 90,
    alignItems: 'center',
    marginRight: 14,
  },
  contactAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(165,154,247,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactAvatarText: { color: colors.primary, fontSize: 20, fontWeight: 'bold' },
  contactLabel: { color: colors.fourth, fontSize: 12, fontWeight: '600' },
  transactionsSection: {
    marginHorizontal: 14,
    marginTop: 16,
    backgroundColor: colors.tertiary,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  transactionsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  transactionsSectionIcon: { marginRight: 10 },
  transactionsSectionTitle: { color: colors.fourth, fontSize: 18, fontWeight: 'bold' },
  transactionsEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  transactionsEmptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(165,154,247,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  transactionsEmptyTitle: {
    color: colors.fourth,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  transactionsEmptySub: {
    color: '#6B6B6B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  transactionsList: { gap: 0 },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  transactionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  transactionBody: { flex: 1 },
  transactionLabel: { color: colors.fourth, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  transactionDate: { color: '#8E8E8E', fontSize: 12 },
  transactionAmount: { fontSize: 15, fontWeight: '700' },
  transactionAmountCredit: { color: '#2E7D32' },
  transactionAmountDebit: { color: '#c62828' },
  kycSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginTop: 16,
    backgroundColor: colors.tertiary,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  kycSectionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  kycSectionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E8E0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  kycSectionTitle: { color: colors.fourth, fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  kycSectionSub: { color: '#6B6B6B', fontSize: 13 },
  section: { paddingHorizontal: 14, paddingTop: 20, paddingBottom: 12 },
  sectionTitle: { color: colors.fourth, fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  sectionSubtitle: { color: '#6B6B6B', fontSize: 14, lineHeight: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tertiary,
    marginHorizontal: 14,
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardBody: { flex: 1 },
  cardTitle: { color: colors.fourth, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  cardSub: { color: '#6B6B6B', fontSize: 13, lineHeight: 18 },
  cardChevron: { marginLeft: 8 },
  footer: { alignItems: 'center', marginTop: 20, paddingVertical: 10 },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(165,154,247,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  footerText: { color: '#5a4d96', fontSize: 13, fontWeight: '600' },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 26,
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  fab: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  fabDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 2,
  },
});
