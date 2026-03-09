/**
 * Écran d'accueil (utilisateur connecté)
 * Design fintech : header avec logo, carte active ou placeholder (+),
 * moyens de paiement, ergonomie et hiérarchie claire.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';
import { showSystemNotification } from '../services/notificationsSystem';

const BALANCE_VISIBLE_STORAGE_KEY = 'ripa_balance_visible';

/**
 * RÈGLE MÉTIER moyens de paiement (à respecter dans AddMobileMoney, Accounts, OrderVirtualCard, RegisterCard + backend) :
 * - Mobile Money : un ou plusieurs comptes autorisés.
 * - Compte bancaire : un ou plusieurs comptes autorisés.
 * - Carte virtuelle : une seule autorisée.
 * - Carte bancaire (physique) : une seule autorisée.
 */
const PAYMENT_ADD_OPTIONS = [
  { type: 'mobile_money', label: 'Mobile Money', sub: 'Airtel, Orange, M-Pesa…', icon: 'mobile-alt', iconBg: '#E8E0FF', screen: 'MobileMoneyList' },
  { type: 'bank_account', label: 'Compte bancaire', sub: 'Banques, IBAN…', icon: 'university', iconBg: '#E8E4F8', screen: 'BankAccountsList' },
  { type: 'virtual_card', label: 'Carte virtuelle', sub: 'Visa / Mastercard', icon: 'credit-card', iconBg: '#F0EDFF', screen: 'OrderVirtualCard' },
  { type: 'physical_card', label: 'Carte bancaire', sub: 'Lier une carte', icon: 'wallet', iconBg: '#E8E0FF', screen: 'RegisterCard' },
];

const MENU_OPTIONS = [
  { key: 'profile', label: 'Mon profil', icon: 'user', screen: null },
  { key: 'notifications', label: 'Notifications', icon: 'bell', screen: 'Notifications' },
  { key: 'help', label: 'Aide', icon: 'question-circle', screen: null },
  { key: 'settings', label: 'Paramètres', icon: 'cog', screen: 'Settings' },
  { key: 'kyc', label: 'KYC', icon: 'id-card', screen: 'Kyc' },
  { key: 'logout', label: 'Déconnexion', icon: 'sign-out-alt', action: 'logout' },
  { key: 'exitApp', label: 'Sortir de l\'application', icon: 'power-off', action: 'exitApp' },
];

export function HomeScreen({ navigation }) {
  const { logout, token } = useApi();
  const [menuVisible, setMenuVisible] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentContacts] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  /** Cartes uniquement pour la bande moyens de paiement : { id, type, label, sub, last4, brand } */
  const [cards, setCards] = useState([]);
  /** Nombre de comptes Mobile Money (pour l'indicateur sur la tuile Mobile Money) */
  const [mobileMoneyCount, setMobileMoneyCount] = useState(0);
  /** Nombre de comptes bancaires (pour l'indicateur sur la tuile Compte bancaire) */
  const [bankAccountCount, setBankAccountCount] = useState(0);
  /** Nombre de notifications non lues (badge menu + barre) */
  const [notificationCount, setNotificationCount] = useState(0);
  /** Statut KYC pour affichage CTA (rejete → message + refaire) */
  const [kycStatus, setKycStatus] = useState(null);
  /** Dernier nombre de notifications pour lequel on a affiché une notif système (éviter spam) */
  const lastNotifiedCountRef = useRef(0);
  /** Afficher ou masquer le solde sur la carte virtuelle (persisté) */
  const [balanceVisible, setBalanceVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(BALANCE_VISIBLE_STORAGE_KEY).then((v) => {
      if (!cancelled && v !== null) setBalanceVisible(v === '1');
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const toggleBalanceVisible = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setBalanceVisible((prev) => {
      const next = !prev;
      AsyncStorage.setItem(BALANCE_VISIBLE_STORAGE_KEY, next ? '1' : '0').catch(() => {});
      return next;
    });
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    if (!token) return;
    setLoadingPaymentMethods(true);
    try {
      const [accountsRes, bankRes, cardsRes, notifRes, kycRes, txRes] = await Promise.all([
        api.getAccounts(token),
        api.getBankAccounts(token),
        api.getCards(token),
        api.getNotifications(token, true),
        api.getKyc(token),
        api.getRecentTransactions(token, 20).catch(() => ({ data: { transactions: [] } })),
      ]);
      const accounts = accountsRes?.data?.accounts ?? [];
      setMobileMoneyCount(accounts.length);
      const bankAccounts = bankRes?.data?.accounts ?? [];
      setBankAccountCount(bankAccounts.length);
      const unreadCount = notifRes?.success && notifRes?.data?.count_unread != null ? notifRes.data.count_unread : 0;
      setNotificationCount(unreadCount);
      if (unreadCount > 0 && unreadCount > lastNotifiedCountRef.current) {
        lastNotifiedCountRef.current = unreadCount;
        const title = 'RIPA';
        const body = unreadCount === 1 ? '1 nouvelle notification' : `${unreadCount} nouvelles notifications`;
        showSystemNotification(title, body, unreadCount).catch(() => {});
      }
      if (kycRes?.success && kycRes?.data?.statut) setKycStatus(kycRes.data.statut);
      const cardsList = (cardsRes?.data?.cards ?? []).map((c) => {
        const isVirtual = (c.type || '').toLowerCase() === 'virtuelle' || (c.type || '').toLowerCase() === 'virtual';
        return {
          id: String(c.id),
          type: isVirtual ? 'virtual_card' : 'physical_card',
          label: `•••• ${c.last4 || '****'}`,
          sub: c.brand || 'Carte',
          last4: c.last4,
          brand: c.brand,
          balance: c.balance != null ? Number(c.balance) : null,
          expiry: c.expiry,
        };
      });
      setCards(cardsList);
      const txList = txRes?.data?.transactions ?? [];
      setRecentTransactions(Array.isArray(txList) ? txList : []);
    } catch (_) {
      setCards([]);
      setMobileMoneyCount(0);
      setRecentTransactions([]);
    } finally {
      setLoadingPaymentMethods(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadPaymentMethods();
    }, [loadPaymentMethods])
  );

  const hasVirtualCard = cards.some((c) => c.type === 'virtual_card');
  const hasPhysicalCard = cards.some((c) => c.type === 'physical_card');
  const addOptionsToShow = [
    PAYMENT_ADD_OPTIONS.find((o) => o.type === 'mobile_money'),
    PAYMENT_ADD_OPTIONS.find((o) => o.type === 'bank_account'),
    ...(hasVirtualCard ? [] : [PAYMENT_ADD_OPTIONS.find((o) => o.type === 'virtual_card')]),
    ...(hasPhysicalCard ? [] : [PAYMENT_ADD_OPTIONS.find((o) => o.type === 'physical_card')]),
  ].filter(Boolean);
  const virtualCard = cards.find((c) => c.type === 'virtual_card') || null;
  const physicalCard = cards.find((c) => c.type === 'physical_card') || null;
  const primaryCard = virtualCard || physicalCard || null;
  const canAddCard = !hasVirtualCard || !hasPhysicalCard;
  const isEmpty = cards.length === 0 && addOptionsToShow.length <= 1;

  const renderAddCardIndicator = (opt) => {
    if (opt.type === 'mobile_money' && mobileMoneyCount > 0) {
      return (
        <View style={styles.pmCardAddIndicator}>
          <FontAwesome5 name="check-circle" size={12} color={colors.secondary} style={styles.pmCardAddIndicatorIcon} />
          <Text style={styles.pmCardAddIndicatorText}>
            {mobileMoneyCount === 1 ? '1 compte enregistré' : `${mobileMoneyCount} comptes enregistrés`}
          </Text>
        </View>
      );
    }
    if (opt.type === 'bank_account' && bankAccountCount > 0) {
      return (
        <View style={styles.pmCardAddIndicator}>
          <FontAwesome5 name="check-circle" size={12} color={colors.secondary} style={styles.pmCardAddIndicatorIcon} />
          <Text style={styles.pmCardAddIndicatorText}>
            {bankAccountCount === 1 ? '1 compte enregistré' : `${bankAccountCount} comptes enregistrés`}
          </Text>
        </View>
      );
    }
    return null;
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
                onPress={() => navigation.navigate('Notifications')}
                style={styles.headerIconBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="bell" size={18} color="rgba(255,255,255,0.92)" />
                {notificationCount > 0 ? (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                style={styles.headerIconBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="ellipsis-v" size={15} color="rgba(255,255,255,0.92)" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Barre de notification : clic ouvre l'écran Notifications */}
          {notificationCount > 0 ? (
            <TouchableOpacity style={styles.notifBar} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.9}>
              <FontAwesome5 name="bell" size={16} color={colors.tertiary} style={styles.notifBarIcon} />
              <Text style={styles.notifBarText}>
                {notificationCount === 1 ? '1 nouvelle notification' : `${notificationCount} nouvelles notifications`}
              </Text>
              <FontAwesome5 name="chevron-right" size={14} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          ) : null}

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

          {/* Tableau de bord — Carte principale + Ajouter une carte (design 2026) */}
          <View style={styles.dashboardSection}>
            <Text style={styles.dashboardSectionTitle}>Tableau de bord</Text>
            <View style={styles.dashboardCardRow}>
              {primaryCard ? (
                <TouchableOpacity
                  style={styles.dashboardMainCard}
                  onPress={() => navigation.navigate('CardDetail', { cardId: primaryCard.id, last4: primaryCard.last4, brand: primaryCard.brand, type: primaryCard.type })}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#2d1b4e', '#1a0d2e']}
                    style={styles.dashboardMainCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.dashboardMainCardTop}>
                      <Text style={styles.dashboardMainCardLabel}>
                        {primaryCard.type === 'virtual_card' ? 'Solde disponible' : 'Ma carte'}
                      </Text>
                      <View style={styles.dashboardMainCardTopRight}>
                        {primaryCard.type === 'virtual_card' && primaryCard.balance != null ? (
                          <TouchableOpacity
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            onPress={toggleBalanceVisible}
                            style={styles.balanceToggleBtn}
                          >
                            <FontAwesome5 name={balanceVisible ? 'eye-slash' : 'eye'} size={16} color="rgba(255,255,255,0.85)" />
                          </TouchableOpacity>
                        ) : (
                          <FontAwesome5 name={primaryCard.type === 'virtual_card' ? 'credit-card' : 'wallet'} size={18} color="rgba(255,255,255,0.7)" />
                        )}
                      </View>
                    </View>
                    {primaryCard.type === 'virtual_card' && primaryCard.balance != null && balanceVisible ? (
                      <Text style={styles.dashboardBalance}>{Number(primaryCard.balance).toFixed(2)} $</Text>
                    ) : primaryCard.type === 'virtual_card' && primaryCard.balance != null && !balanceVisible ? (
                      <Text style={styles.dashboardBalanceMasked}>•••• •• $</Text>
                    ) : null}
                    <Text style={styles.dashboardPan}>•••• {primaryCard.last4 || '****'}</Text>
                    <View style={styles.dashboardMainCardBottom}>
                      <Text style={styles.dashboardBrand}>{primaryCard.brand || 'Carte'}</Text>
                      <FontAwesome5 name="chevron-right" size={14} color="rgba(255,255,255,0.8)" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ) : null}
              {canAddCard ? (
                <TouchableOpacity
                  style={[styles.dashboardAddCard, !primaryCard && styles.dashboardAddCardFull]}
                  onPress={onAddCardPress}
                  activeOpacity={0.9}
                >
                  <View style={styles.dashboardAddCardInner}>
                    <View style={styles.dashboardAddCardIconWrap}>
                      <FontAwesome5 name="plus" size={28} color={colors.primary} />
                    </View>
                    <Text style={styles.dashboardAddCardTitle}>Ajouter une carte</Text>
                    <Text style={styles.dashboardAddCardSub}>Virtuelle ou bancaire</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Moyens de paiement (au-dessus de Récentes transactions) — défilement horizontal */}
          <View style={styles.paymentSection}>
            <View style={styles.paymentSectionHeader}>
              <FontAwesome5 name="wallet" size={18} color={colors.primary} style={styles.paymentSectionIcon} />
              <View>
                <Text style={styles.paymentSectionTitle}>Moyens de paiement</Text>
                <Text style={styles.paymentSectionSubtitle}>
                  {cards.length === 0 ? 'Ajoutez un moyen pour payer et recevoir' : 'Vos moyens enregistrés'}
                </Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.paymentScrollContent}
            >
              {/* Tuile Mobile Money : liste + ajout (comme avant) */}
              <TouchableOpacity
                style={styles.pmCardAdd}
                onPress={() => navigation.navigate('MobileMoneyList')}
                activeOpacity={0.85}
              >
                <View style={[styles.pmCardIconWrap, { backgroundColor: PAYMENT_ADD_OPTIONS[0].iconBg }]}>
                  <FontAwesome5 name="mobile-alt" size={24} color={colors.primary} />
                </View>
                <Text style={styles.pmCardLabel}>Mobile Money</Text>
                <Text style={styles.pmCardSub}>Airtel, Orange, M-Pesa…</Text>
                {renderAddCardIndicator(PAYMENT_ADD_OPTIONS[0])}
                <View style={styles.pmCardAddBadge}>
                  <FontAwesome5 name="plus" size={12} color={colors.tertiary} />
                </View>
              </TouchableOpacity>

              {/* Tuile Compte bancaire : liste + ajout (Accounts) */}
              <TouchableOpacity
                style={styles.pmCardAdd}
                onPress={() => navigation.navigate('BankAccountsList')}
                activeOpacity={0.85}
              >
                <View style={[styles.pmCardIconWrap, { backgroundColor: PAYMENT_ADD_OPTIONS[1].iconBg }]}>
                  <FontAwesome5 name="university" size={24} color={colors.primary} />
                </View>
                <Text style={styles.pmCardLabel}>Compte bancaire</Text>
                <Text style={styles.pmCardSub}>Banques, IBAN…</Text>
                {renderAddCardIndicator(PAYMENT_ADD_OPTIONS[1])}
                <View style={styles.pmCardAddBadge}>
                  <FontAwesome5 name="plus" size={12} color={colors.tertiary} />
                </View>
              </TouchableOpacity>

              {/* Cartes enregistrées : détail au clic (PCI DSS) */}
              {cards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.pmCardRegistered}
                  onPress={() => navigation.navigate('CardDetail', { cardId: card.id, last4: card.last4, brand: card.brand, type: card.type })}
                  activeOpacity={0.85}
                >
                  <View style={[styles.pmCardIconWrap, { backgroundColor: '#E8E0FF' }]}>
                    <FontAwesome5 name={card.type === 'virtual_card' ? 'credit-card' : 'wallet'} size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.pmCardLabel} numberOfLines={1}>{card.label}</Text>
                  {card.sub ? <Text style={styles.pmCardSub} numberOfLines={1}>{card.sub}</Text> : null}
                  <FontAwesome5 name="chevron-right" size={12} color="#B0B0B0" style={styles.pmCardChevron} />
                </TouchableOpacity>
              ))}

              {/* Ajouter carte virtuelle ou physique si pas déjà enregistrée */}
              {addOptionsToShow.filter((o) => o.type !== 'mobile_money' && o.type !== 'bank_account').map((opt) => (
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
                  <View style={styles.pmCardAddBadge}>
                    <FontAwesome5 name="plus" size={12} color={colors.tertiary} />
                  </View>
                </TouchableOpacity>
              ))}
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
                <Text style={styles.transactionsEmptySub}>Paiements, réceptions, transferts, recharge et décharge carte apparaîtront ici</Text>
              </View>
            ) : (
              <View style={styles.transactionsList}>
                {recentTransactions.slice(0, 15).map((tx, index) => {
                  const isCredit = tx.is_credit === true;
                  const iconName = tx.type === 'recharge' ? 'credit-card' : tx.type === 'retrait' ? 'wallet' : tx.type === 'payment' ? 'hand-holding-usd' : tx.type === 'reception' ? 'arrow-down' : tx.type === 'transfer' ? 'exchange-alt' : isCredit ? 'arrow-down' : 'arrow-up';
                  return (
                    <View key={tx.id || `tx-${index}`} style={styles.transactionRow}>
                      <View style={[styles.transactionIconWrap, { backgroundColor: isCredit ? '#E8F5E9' : '#FFEBEE' }]}>
                        <FontAwesome5 name={iconName} size={14} color={isCredit ? '#2E7D32' : '#c62828'} />
                      </View>
                      <View style={styles.transactionBody}>
                        <Text style={styles.transactionLabel}>{tx.label || 'Transaction'}</Text>
                        <Text style={styles.transactionDate}>{tx.date || ''}</Text>
                      </View>
                      <Text style={[styles.transactionAmount, isCredit ? styles.transactionAmountCredit : styles.transactionAmountDebit]}>
                        {isCredit ? '+' : '-'}{typeof tx.amount === 'number' ? tx.amount.toFixed(2) : tx.amount || '0'} $
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Section KYC */}
          <TouchableOpacity style={[styles.kycSection, kycStatus === 'rejete' && styles.kycSectionRejected]} onPress={() => navigation.navigate('Kyc')} activeOpacity={0.85}>
            <View style={styles.kycSectionLeft}>
              <View style={[styles.kycSectionIconWrap, kycStatus === 'rejete' && styles.kycSectionIconWrapRejected]}>
                <FontAwesome5 name="id-card" size={22} color={kycStatus === 'rejete' ? '#c62828' : colors.primary} />
              </View>
              <View style={styles.kycSectionTextWrap}>
                <Text style={styles.kycSectionTitle} numberOfLines={1}>Vérification d’identité (KYC)</Text>
                <Text style={styles.kycSectionSub} numberOfLines={2}>{kycStatus === 'rejete' ? 'Dossier rejeté — Refaire le KYC et resoumettre' : 'Statut et prochaine échéance'}</Text>
              </View>
            </View>
            <FontAwesome5 name="chevron-right" size={16} color="#B0B0B0" style={styles.kycSectionChevron} />
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
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginLeft: 6,
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#c62828',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: { color: colors.tertiary, fontSize: 10, fontWeight: 'bold' },
  notifBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(198,40,40,0.9)',
    marginHorizontal: 14,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  notifBarIcon: { marginRight: 10 },
  notifBarText: { color: colors.tertiary, fontSize: 14, fontWeight: '600', flex: 1 },
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
  dashboardSection: {
    marginHorizontal: 14,
    marginTop: 20,
    marginBottom: 4,
  },
  dashboardSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E8E',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  dashboardCardRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  dashboardMainCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  dashboardMainCardGradient: {
    padding: 22,
    minHeight: 168,
    justifyContent: 'space-between',
  },
  dashboardMainCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardMainCardLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  dashboardMainCardTopRight: { flexDirection: 'row', alignItems: 'center' },
  balanceToggleBtn: { padding: 6 },
  dashboardBalanceMasked: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
    letterSpacing: 2,
  },
  dashboardBalance: {
    color: colors.tertiary,
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  dashboardPan: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    letterSpacing: 2,
  },
  dashboardMainCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardBrand: {
    color: colors.tertiary,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  dashboardAddCard: {
    width: 140,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 2,
    borderColor: 'rgba(165,154,247,0.35)',
    borderStyle: 'dashed',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    justifyContent: 'center',
    padding: 16,
  },
  dashboardAddCardFull: {
    flex: 1,
    width: undefined,
    minHeight: 168,
  },
  dashboardAddCardInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardAddCardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(165,154,247,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dashboardAddCardTitle: {
    color: colors.fourth,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  dashboardAddCardSub: {
    color: '#6B6B6B',
    fontSize: 12,
    textAlign: 'center',
  },
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
  pmCardChevron: { marginTop: 6 },
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
  kycSectionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  kycSectionTextWrap: { flex: 1, minWidth: 0 },
  kycSectionChevron: { marginLeft: 8 },
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
  kycSectionRejected: { borderColor: 'rgba(198,40,40,0.3)', backgroundColor: '#FFEBEE' },
  kycSectionIconWrapRejected: { backgroundColor: 'rgba(198,40,40,0.12)' },
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
    bottom: 48,
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
