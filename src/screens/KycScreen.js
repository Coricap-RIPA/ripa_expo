/**
 * Écran KYC : voir le statut ou compléter le formulaire
 * Si validé : infos en lecture + date prochaine KYC + réclamation (WhatsApp)
 * Sinon : bouton pour faire le KYC (formulaire à venir en étapes avec caméra)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/theme';
import { useApi } from '../context/ApiContext';
import * as api from '../services/api';
import * as storage from '../services/storage';

const RIPA_WHATSAPP = ''; // À remplir : numéro service client RIPA

export function KycScreen({ navigation }) {
  const { token } = useApi();
  const [loading, setLoading] = useState(true);
  const [kyc, setKyc] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const t = token || (await storage.getToken());
      if (!t) {
        if (!cancelled) setKyc(null);
        return;
      }
      try {
        const res = await api.getKyc(t);
        if (!cancelled && res.success && res.data) setKyc(res.data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  const openWhatsApp = () => {
    if (!RIPA_WHATSAPP) return;
    const url = `https://wa.me/${RIPA_WHATSAPP.replace(/\D/g, '')}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={[colors.primary, '#3d0f5c']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <FontAwesome5 name="arrow-left" size={20} color={colors.tertiary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>KYC</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.card}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : !kyc?.has_kyc ? (
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <FontAwesome5 name="id-card" size={40} color={colors.secondary} />
              </View>
              <Text style={styles.cardTitle}>Complétez votre KYC</Text>
              <Text style={styles.cardSub}>La vérification d’identité est requise pour enregistrer une carte bancaire.</Text>
              <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('KycForm')} activeOpacity={0.85}>
                <Text style={styles.ctaText}>Commencer le KYC</Text>
                <FontAwesome5 name="arrow-right" size={18} color={colors.tertiary} style={styles.ctaIcon} />
              </TouchableOpacity>
            </View>
          ) : kyc.statut === 'en_attente' ? (
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <FontAwesome5 name="clock" size={40} color={colors.secondary} />
              </View>
              <Text style={styles.cardTitle}>KYC en attente</Text>
              <Text style={styles.cardSub}>Votre dossier est en cours de validation par l’équipe RIPA.</Text>
            </View>
          ) : kyc.statut === 'rejete' ? (
            <View style={styles.card}>
              <View style={[styles.iconWrap, styles.iconWrapRejected]}>
                <FontAwesome5 name="times-circle" size={40} color="#c62828" />
              </View>
              <Text style={styles.cardTitle}>KYC rejeté</Text>
              <Text style={styles.cardSub}>Votre dossier a été rejeté. Vous pouvez soumettre un nouveau dossier.</Text>
              <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('KycForm')} activeOpacity={0.85}>
                <Text style={styles.ctaText}>Refaire le KYC et resoumettre</Text>
                <FontAwesome5 name="arrow-right" size={18} color={colors.tertiary} style={styles.ctaIcon} />
              </TouchableOpacity>
            </View>
          ) : kyc.statut === 'valide' && kyc.data ? (
            <View style={styles.card}>
              <View style={styles.badgeValid}>
                <FontAwesome5 name="check-circle" size={24} color="#2E7D32" />
                <Text style={styles.badgeValidText}>KYC validé</Text>
              </View>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Nom</Text><Text style={styles.dataValue}>{kyc.data.nom} {kyc.data.post_nom} {kyc.data.prenom}</Text></View>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Date de naissance</Text><Text style={styles.dataValue}>{kyc.data.date_naissance}</Text></View>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Adresse</Text><Text style={styles.dataValue}>{kyc.data.adresse}</Text></View>
              {(kyc.data.photo_piece_base64 || kyc.data.photo_utilisateur_base64) ? (
                <View style={styles.kycPhotosRow}>
                  {kyc.data.photo_piece_base64 ? (
                    <View style={styles.kycPhotoBlock}>
                      <Text style={styles.kycPhotoLabel}>Pièce d'identité</Text>
                      <Image source={{ uri: `data:image/jpeg;base64,${kyc.data.photo_piece_base64}` }} style={styles.kycPhotoImg} resizeMode="cover" />
                    </View>
                  ) : null}
                  {kyc.data.photo_utilisateur_base64 ? (
                    <View style={styles.kycPhotoBlock}>
                      <Text style={styles.kycPhotoLabel}>Photo passeport / selfie</Text>
                      <Image source={{ uri: `data:image/jpeg;base64,${kyc.data.photo_utilisateur_base64}` }} style={styles.kycPhotoImg} resizeMode="cover" />
                    </View>
                  ) : null}
                </View>
              ) : null}
              {kyc.date_prochaine_kyc ? (
                <Text style={styles.nextKyc}>Prochaine révision KYC : {kyc.date_prochaine_kyc}</Text>
              ) : null}
              {RIPA_WHATSAPP ? (
                <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp} activeOpacity={0.85}>
                  <FontAwesome5 name="whatsapp" size={20} color={colors.tertiary} style={styles.ctaIcon} />
                  <Text style={styles.ctaText}>Réclamation / modification</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.hint}>Réclamation : contactez le service client RIPA (numéro à configurer).</Text>
              )}
            </View>
          ) : null}
        </ScrollView>
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
  scroll: { flex: 1, backgroundColor: '#FAFAFC' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  centered: { padding: 40, alignItems: 'center' },
  card: {
    backgroundColor: colors.tertiary,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(165,154,247,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardTitle: { color: colors.fourth, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  cardSub: { color: '#6B6B6B', fontSize: 14, marginBottom: 20, lineHeight: 20 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary, paddingVertical: 18, borderRadius: 14, marginTop: 8 },
  ctaText: { color: colors.tertiary, fontSize: 17, fontWeight: 'bold' },
  ctaIcon: { marginLeft: 10 },
  errorText: { color: '#c62828', fontSize: 14 },
  badgeValid: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  badgeValidText: { color: '#2E7D32', fontSize: 18, fontWeight: 'bold' },
  dataRow: { marginBottom: 12 },
  dataLabel: { color: '#6B6B6B', fontSize: 12, marginBottom: 2 },
  dataValue: { color: colors.fourth, fontSize: 15, fontWeight: '600' },
  nextKyc: { color: '#6B6B6B', fontSize: 13, marginTop: 16 },
  whatsappBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', paddingVertical: 14, borderRadius: 14, marginTop: 20 },
  hint: { color: '#6B6B6B', fontSize: 13, marginTop: 16 },
  iconWrapRejected: { backgroundColor: 'rgba(198,40,40,0.12)' },
  kycPhotosRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, gap: 16 },
  kycPhotoBlock: { width: '100%', marginBottom: 8 },
  kycPhotoLabel: { color: '#6B6B6B', fontSize: 13, marginBottom: 6, fontWeight: '600' },
  kycPhotoImg: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#F0F0F0' },
});
