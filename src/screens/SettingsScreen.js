/**
 * Écran Paramètres — accès KYC, Comptes, Notifications
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/theme';

const SETTINGS_ITEMS = [
  { key: 'mobile_money', label: 'Mes comptes Mobile Money', sub: 'Lister, ajouter, éditer, supprimer', icon: 'mobile-alt', screen: 'MobileMoneyList' },
  { key: 'bank_accounts', label: 'Mes comptes bancaires', sub: 'Lister, ajouter, éditer, supprimer', icon: 'university', screen: 'BankAccountsList' },
  { key: 'kyc', label: 'KYC', sub: 'Vérification d\'identité', icon: 'id-card', screen: 'Kyc' },
  { key: 'notifications', label: 'Notifications', sub: 'Alertes et actualités', icon: 'bell', screen: 'Notifications' },
];

export function SettingsScreen({ navigation }) {
  return (
    <>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={[colors.primary, '#3d0f5c']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <FontAwesome5 name="arrow-left" size={20} color={colors.tertiary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paramètres</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>
        <View style={styles.content}>
          {SETTINGS_ITEMS.map((item) => (
            <TouchableOpacity key={item.key} style={styles.row} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.85}>
              <View style={styles.rowIconWrap}>
                <FontAwesome5 name={item.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowSub}>{item.sub}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#B0B0B0" />
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  backBtn: { padding: 8 },
  headerTitle: { color: colors.tertiary, fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 36 },
  content: { flex: 1, backgroundColor: '#FAFAFC', padding: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tertiary,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  rowIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8E0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowBody: { flex: 1 },
  rowLabel: { color: colors.fourth, fontSize: 16, fontWeight: '600' },
  rowSub: { color: '#6B6B6B', fontSize: 13, marginTop: 2 },
});
