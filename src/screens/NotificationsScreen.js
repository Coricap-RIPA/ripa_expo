/**
 * Écran Notifications (KYC validé/rejeté/supprimé, etc.)
 * Liste des notifications avec possibilité de marquer comme lues.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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

const ICON_SIZE = 20;

function getIconForType(type) {
  if (type === 'kyc_valide') return { name: 'check-circle', color: '#2E7D32' };
  if (type === 'kyc_rejete') return { name: 'times-circle', color: '#c62828' };
  if (type === 'kyc_supprime') return { name: 'trash-alt', color: '#6B6B6B' };
  return { name: 'bell', color: colors.primary };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'À l\'instant';
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function NotificationsScreen({ navigation }) {
  const { token } = useApi();
  const [list, setList] = useState([]);
  const [countUnread, setCountUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const t = token;
    if (!t) return;
    try {
      const res = await api.getNotifications(t);
      if (res.success && res.data) {
        setList(res.data.notifications || []);
        setCountUnread(res.data.count_unread ?? 0);
      }
    } catch (_) {
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const markAllRead = async () => {
    if (!token || countUnread === 0) return;
    try {
      await api.markNotificationsRead(token, { all: true });
      setCountUnread(0);
      setList((prev) => prev.map((n) => ({ ...n, lu: 1 })));
    } catch (_) {}
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={[colors.primary, '#3d0f5c']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <FontAwesome5 name="arrow-left" size={ICON_SIZE} color={colors.tertiary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        {countUnread > 0 && (
          <TouchableOpacity style={styles.markAllWrap} onPress={markAllRead}>
            <FontAwesome5 name="check-double" size={14} color={colors.secondary} />
            <Text style={styles.markAllText}>Tout marquer comme lu</Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <FontAwesome5 name="bell-slash" size={48} color="#B0B0B0" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptySub}>Les mises à jour (KYC, etc.) apparaîtront ici.</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
          >
            {list.map((n) => {
              const icon = getIconForType(n.type);
              return (
                <View key={n.id_notification} style={[styles.card, !n.lu && styles.cardUnread]}>
                  <View style={[styles.iconWrap, { backgroundColor: icon.color + '20' }]}>
                    <FontAwesome5 name={icon.name} size={22} color={icon.color} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{n.titre}</Text>
                    <Text style={styles.cardMessage}>{n.message}</Text>
                    <Text style={styles.cardDate}>{formatDate(n.date_creation)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
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
  markAllWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F5F5F7',
    gap: 8,
  },
  markAllText: { color: colors.secondary, fontSize: 14, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { marginBottom: 16 },
  emptyTitle: { color: colors.fourth, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySub: { color: '#6B6B6B', fontSize: 14, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.tertiary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: colors.secondary },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardBody: { flex: 1 },
  cardTitle: { color: colors.fourth, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardMessage: { color: '#6B6B6B', fontSize: 14, lineHeight: 20 },
  cardDate: { color: '#9E9E9E', fontSize: 12, marginTop: 6 },
});
