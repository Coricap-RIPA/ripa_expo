/**
 * Écran : Commander une carte virtuelle (phase 1 – placeholder)
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

export function OrderVirtualCardScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Commander une carte virtuelle</Text>
      <Text style={styles.sub}>Bientôt disponible (1 $, KYC)</Text>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
        <Text style={styles.btnText}>Retour</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, padding: 24, justifyContent: 'center' },
  text: { color: colors.tertiary, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  sub: { color: colors.secondary, marginBottom: 24 },
  btn: { backgroundColor: colors.secondary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: colors.tertiary, fontWeight: 'bold' },
});
