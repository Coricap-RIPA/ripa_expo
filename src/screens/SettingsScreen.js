/**
 * Écran Paramètres (placeholder)
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/theme';

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
          <Text style={styles.placeholder}>Paramètres — à venir</Text>
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
  content: { flex: 1, backgroundColor: '#FAFAFC', padding: 24, justifyContent: 'center' },
  placeholder: { color: '#6B6B6B', fontSize: 16, textAlign: 'center' },
});
