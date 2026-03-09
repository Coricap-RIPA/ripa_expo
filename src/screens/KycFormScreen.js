/**
 * Formulaire KYC en 5 étapes :
 * 1. Identité (nom, post-nom, prénom, date de naissance)
 * 2. Adresse
 * 3. Photo pièce d'identité (caméra arrière)
 * 4. Photo utilisateur / selfie (caméra avant)
 * 5. Récapitulatif et envoi
 */
import React, { useState, useEffect } from 'react';
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
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/theme';
import { useApi } from '../context/ApiContext';
import * as api from '../services/api';
import * as storage from '../services/storage';

const STEPS = [
  { key: 1, title: 'Identité', icon: 'user' },
  { key: 2, title: 'Adresse', icon: 'home' },
  { key: 3, title: 'Pièce d\'identité', icon: 'id-card' },
  { key: 4, title: 'Votre photo', icon: 'camera' },
  { key: 5, title: 'Envoi', icon: 'paper-plane' },
];
const ICON_SIZE = 20;

export function KycFormScreen({ navigation }) {
  const { token } = useApi();
  const [step, setStep] = useState(1);
  const [nom, setNom] = useState('');
  const [postNom, setPostNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [adresse, setAdresse] = useState('');
  const [photoPieceUri, setPhotoPieceUri] = useState(null);
  const [photoPieceBase64, setPhotoPieceBase64] = useState(null);
  const [photoSelfieUri, setPhotoSelfieUri] = useState(null);
  const [photoSelfieBase64, setPhotoSelfieBase64] = useState(null);
  /** Aperçus des photos déjà envoyées (KYC rejeté) — base64 pour affichage uniquement */
  const [photoPiecePreviewBase64, setPhotoPiecePreviewBase64] = useState(null);
  const [photoSelfiePreviewBase64, setPhotoSelfiePreviewBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingKyc, setLoadingKyc] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadRejectedKyc() {
      const t = token || (await storage.getToken());
      if (!t) {
        if (!cancelled) setLoadingKyc(false);
        return;
      }
      try {
        const res = await api.getKyc(t);
        if (cancelled) return;
        if (res.success && res.data?.statut === 'rejete' && res.data?.data) {
          const d = res.data.data;
          if (d.nom) setNom(d.nom);
          if (d.post_nom) setPostNom(d.post_nom);
          if (d.prenom) setPrenom(d.prenom);
          if (d.date_naissance) setDateNaissance(d.date_naissance);
          if (d.adresse) setAdresse(d.adresse);
          if (d.photo_piece_base64) setPhotoPiecePreviewBase64(d.photo_piece_base64);
          if (d.photo_utilisateur_base64) setPhotoSelfiePreviewBase64(d.photo_utilisateur_base64);
        }
      } catch (_) {
        if (!cancelled) setLoadingKyc(false);
        return;
      }
      if (!cancelled) setLoadingKyc(false);
    }
    loadRejectedKyc();
    return () => { cancelled = true; };
  }, [token]);

  const canStep1 = nom.trim().length >= 2 && postNom.trim().length >= 2 && prenom.trim().length >= 2 && dateNaissance.trim().length >= 8;
  const canStep2 = adresse.trim().length >= 5;
  const canStep3 = !!photoPieceBase64;
  const canStep4 = !!photoSelfieBase64;

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Autorisation requise', 'L\'accès à la caméra est nécessaire pour prendre les photos du KYC.');
      return false;
    }
    return true;
  };

  const takePhoto = async (cameraType) => {
    const ok = await requestCameraPermission();
    if (!ok) return;
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.4,
        base64: true,
        cameraType: cameraType === 'front' ? 'front' : 'back',
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (cameraType === 'back') {
        setPhotoPieceUri(asset.uri);
        setPhotoPieceBase64(asset.base64 || null);
      } else {
        setPhotoSelfieUri(asset.uri);
        setPhotoSelfieBase64(asset.base64 || null);
      }
      setError(null);
    } catch (e) {
      setError(e.message || 'Erreur lors de la prise de photo.');
    }
  };

  const onSubmit = async () => {
    if (!canStep1 || !canStep2 || !canStep3 || !canStep4) return;
    setLoading(true);
    setError(null);
    const t = token || (await storage.getToken());
    if (!t) {
      setError('Session expirée.');
      setLoading(false);
      return;
    }
    try {
      const res = await api.submitKyc(t, {
        nom: nom.trim(),
        post_nom: postNom.trim(),
        prenom: prenom.trim(),
        date_naissance: dateNaissance.trim(),
        adresse: adresse.trim(),
        photo_piece_identite: photoPieceBase64,
        photo_utilisateur: photoSelfieBase64,
      });
      if (res.success) {
        Alert.alert('KYC soumis', 'Votre dossier a été envoyé. L\'équipe RIPA le validera sous peu.', [
          { text: 'OK', onPress: () => navigation.replace('Kyc') },
        ]);
      } else {
        setError(res.message || 'Erreur lors de l\'envoi.');
      }
    } catch (e) {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('volumineux') || msg.includes('500') || msg.includes('taille')) {
        setError("Les photos sont trop lourdes. Réduisez la qualité ou reprenez des photos plus petites.");
      } else {
        setError(msg || 'Erreur réseau.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDateInput = (text) => {
    let v = text.replace(/\D/g, '').slice(0, 8);
    if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
    if (v.length >= 5) v = v.slice(0, 5) + '/' + v.slice(5);
    return v;
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={[colors.primary, '#3d0f5c']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <FontAwesome5 name="arrow-left" size={ICON_SIZE} color={colors.tertiary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>KYC — Étape {step}/5</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <View style={styles.stepIndicator}>
          {STEPS.map((s) => (
            <View key={s.key} style={[styles.stepDot, step >= s.key && styles.stepDotActive]} />
          ))}
        </View>

        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {step === 1 && (
              <View style={styles.card}>
                <View style={styles.stepIconWrap}>
                  <FontAwesome5 name="user" size={28} color={colors.secondary} />
                </View>
                <Text style={styles.cardTitle}>Votre identité</Text>
                <Text style={styles.cardSub}>Nom, post-nom, prénom et date de naissance</Text>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Nom</Text>
                  <TextInput style={styles.input} placeholder="Ex. Kabongo" placeholderTextColor="#999" value={nom} onChangeText={setNom} autoCapitalize="words" />
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Post-nom</Text>
                  <TextInput style={styles.input} placeholder="Ex. Mukendi" placeholderTextColor="#999" value={postNom} onChangeText={setPostNom} autoCapitalize="words" />
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Prénom</Text>
                  <TextInput style={styles.input} placeholder="Ex. Jean" placeholderTextColor="#999" value={prenom} onChangeText={setPrenom} autoCapitalize="words" />
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Date de naissance (JJ/MM/AAAA)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="25/06/1990"
                    placeholderTextColor="#999"
                    value={dateNaissance}
                    onChangeText={(t) => setDateNaissance(formatDateInput(t))}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TouchableOpacity style={[styles.cta, !canStep1 && styles.ctaDisabled]} onPress={() => { setStep(2); setError(null); }} disabled={!canStep1} activeOpacity={0.85}>
                  <Text style={styles.ctaText}>Continuer</Text>
                  <FontAwesome5 name="arrow-right" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                </TouchableOpacity>
              </View>
            )}

            {step === 2 && (
              <View style={styles.card}>
                <View style={styles.stepIconWrap}>
                  <FontAwesome5 name="home" size={28} color={colors.secondary} />
                </View>
                <Text style={styles.cardTitle}>Adresse</Text>
                <Text style={styles.cardSub}>Votre adresse complète</Text>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Adresse</Text>
                  <TextInput
                    style={[styles.input, styles.inputArea]}
                    placeholder="Ex. 123 avenue du Commerce, Kinshasa"
                    placeholderTextColor="#999"
                    value={adresse}
                    onChangeText={setAdresse}
                    multiline
                    numberOfLines={3}
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TouchableOpacity style={styles.ctaSecondary} onPress={() => setStep(1)} activeOpacity={0.85}>
                  <Text style={styles.ctaSecondaryText}>Retour</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cta, !canStep2 && styles.ctaDisabled]} onPress={() => { setStep(3); setError(null); }} disabled={!canStep2} activeOpacity={0.85}>
                  <Text style={styles.ctaText}>Continuer</Text>
                  <FontAwesome5 name="arrow-right" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                </TouchableOpacity>
              </View>
            )}

            {step === 3 && (
              <View style={styles.card}>
                <View style={styles.stepIconWrap}>
                  <FontAwesome5 name="id-card" size={28} color={colors.secondary} />
                </View>
                <Text style={styles.cardTitle}>Pièce d'identité</Text>
                <Text style={styles.cardSub}>Prenez une photo de votre pièce d'identité (caméra arrière)</Text>
                {photoPieceUri ? (
                  <>
                    <Image source={{ uri: photoPieceUri }} style={styles.photoPreview} resizeMode="cover" />
                    <TouchableOpacity style={styles.ctaSecondary} onPress={() => takePhoto('back')} activeOpacity={0.85}>
                      <Text style={styles.ctaSecondaryText}>Reprendre la photo</Text>
                    </TouchableOpacity>
                  </>
                ) : photoPiecePreviewBase64 ? (
                  <>
                    <Text style={styles.photoPreviouslyLabel}>Photo précédemment envoyée</Text>
                    <Image source={{ uri: `data:image/jpeg;base64,${photoPiecePreviewBase64}` }} style={styles.photoThumbPreview} resizeMode="cover" />
                    <TouchableOpacity style={styles.photoBtn} onPress={() => takePhoto('back')} activeOpacity={0.85}>
                      <FontAwesome5 name="camera" size={40} color={colors.secondary} />
                      <Text style={styles.photoBtnText}>Prendre une nouvelle photo</Text>
                      <Text style={styles.photoBtnSub}>Remplacer la photo rejetée</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.photoBtn} onPress={() => takePhoto('back')} activeOpacity={0.85}>
                    <FontAwesome5 name="camera" size={40} color={colors.secondary} />
                    <Text style={styles.photoBtnText}>Ouvrir la caméra</Text>
                    <Text style={styles.photoBtnSub}>Caméra arrière</Text>
                  </TouchableOpacity>
                )}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TouchableOpacity style={styles.ctaSecondary} onPress={() => setStep(2)} activeOpacity={0.85}>
                  <Text style={styles.ctaSecondaryText}>Retour</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cta, !canStep3 && styles.ctaDisabled]} onPress={() => { setStep(4); setError(null); }} disabled={!canStep3} activeOpacity={0.85}>
                  <Text style={styles.ctaText}>Continuer</Text>
                  <FontAwesome5 name="arrow-right" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                </TouchableOpacity>
              </View>
            )}

            {step === 4 && (
              <View style={styles.card}>
                <View style={styles.stepIconWrap}>
                  <FontAwesome5 name="user-circle" size={28} color={colors.secondary} />
                </View>
                <Text style={styles.cardTitle}>Votre photo (selfie)</Text>
                <Text style={styles.cardSub}>Prenez une photo de vous (caméra avant)</Text>
                {photoSelfieUri ? (
                  <>
                    <Image source={{ uri: photoSelfieUri }} style={styles.photoPreview} resizeMode="cover" />
                    <TouchableOpacity style={styles.ctaSecondary} onPress={() => takePhoto('front')} activeOpacity={0.85}>
                      <Text style={styles.ctaSecondaryText}>Reprendre la photo</Text>
                    </TouchableOpacity>
                  </>
                ) : photoSelfiePreviewBase64 ? (
                  <>
                    <Text style={styles.photoPreviouslyLabel}>Photo précédemment envoyée</Text>
                    <Image source={{ uri: `data:image/jpeg;base64,${photoSelfiePreviewBase64}` }} style={styles.photoThumbPreview} resizeMode="cover" />
                    <TouchableOpacity style={styles.photoBtn} onPress={() => takePhoto('front')} activeOpacity={0.85}>
                      <FontAwesome5 name="user-circle" size={40} color={colors.secondary} />
                      <Text style={styles.photoBtnText}>Prendre une nouvelle photo</Text>
                      <Text style={styles.photoBtnSub}>Remplacer la photo rejetée</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.photoBtn} onPress={() => takePhoto('front')} activeOpacity={0.85}>
                    <FontAwesome5 name="user-circle" size={40} color={colors.secondary} />
                    <Text style={styles.photoBtnText}>Prendre un selfie</Text>
                    <Text style={styles.photoBtnSub}>Caméra avant</Text>
                  </TouchableOpacity>
                )}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TouchableOpacity style={styles.ctaSecondary} onPress={() => setStep(3)} activeOpacity={0.85}>
                  <Text style={styles.ctaSecondaryText}>Retour</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cta, !canStep4 && styles.ctaDisabled]} onPress={() => { setStep(5); setError(null); }} disabled={!canStep4} activeOpacity={0.85}>
                  <Text style={styles.ctaText}>Continuer</Text>
                  <FontAwesome5 name="arrow-right" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                </TouchableOpacity>
              </View>
            )}

            {step === 5 && (
              <View style={styles.card}>
                <View style={styles.stepIconWrap}>
                  <FontAwesome5 name="paper-plane" size={28} color={colors.secondary} />
                </View>
                <Text style={styles.cardTitle}>Récapitulatif</Text>
                <Text style={styles.cardSub}>Vérifiez vos informations avant envoi</Text>
                <View style={styles.recapRow}><Text style={styles.recapLabel}>Nom</Text><Text style={styles.recapValue}>{nom} {postNom} {prenom}</Text></View>
                <View style={styles.recapRow}><Text style={styles.recapLabel}>Date de naissance</Text><Text style={styles.recapValue}>{dateNaissance}</Text></View>
                <View style={styles.recapRow}><Text style={styles.recapLabel}>Adresse</Text><Text style={styles.recapValue}>{adresse}</Text></View>
                <View style={styles.recapRow}><Text style={styles.recapLabel}>Pièce d'identité</Text><Text style={styles.recapValue}>✓ Photo enregistrée</Text></View>
                <View style={styles.recapRow}><Text style={styles.recapLabel}>Photo selfie</Text><Text style={styles.recapValue}>✓ Photo enregistrée</Text></View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TouchableOpacity style={styles.ctaSecondary} onPress={() => setStep(4)} activeOpacity={0.85}>
                  <Text style={styles.ctaSecondaryText}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cta, loading && styles.ctaDisabled]} onPress={onSubmit} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color={colors.tertiary} /> : (
                    <>
                      <Text style={styles.ctaText}>Envoyer le dossier KYC</Text>
                      <FontAwesome5 name="check" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: colors.primary },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  stepDotActive: { backgroundColor: colors.secondary },
  container: { flex: 1, backgroundColor: '#FAFAFC' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
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
  stepIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(165,154,247,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardTitle: { color: colors.fourth, fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  cardSub: { color: '#6B6B6B', fontSize: 14, marginBottom: 20, lineHeight: 20 },
  fieldWrap: { marginBottom: 18 },
  label: { color: colors.fourth, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.fourth,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  inputArea: { minHeight: 80, textAlignVertical: 'top' },
  errorText: { color: '#c62828', fontSize: 14, marginBottom: 16 },
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
  ctaSecondary: { alignItems: 'center', marginTop: 12 },
  ctaSecondaryText: { color: colors.secondary, fontSize: 15, fontWeight: '600' },
  photoBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(165,154,247,0.5)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(165,154,247,0.08)',
  },
  photoBtnText: { color: colors.primary, fontSize: 16, fontWeight: 'bold', marginTop: 12 },
  photoBtnSub: { color: '#6B6B6B', fontSize: 13, marginTop: 4 },
  photoPreviouslyLabel: { color: '#6B6B6B', fontSize: 12, marginBottom: 8 },
  photoThumbPreview: { width: '100%', maxHeight: 120, height: 120, borderRadius: 12, marginBottom: 12, backgroundColor: '#eee' },
  photoPreview: { width: '100%', height: 220, borderRadius: 16, marginBottom: 16, backgroundColor: '#eee' },
  recapRow: { marginBottom: 12 },
  recapLabel: { color: '#6B6B6B', fontSize: 12, marginBottom: 2 },
  recapValue: { color: colors.fourth, fontSize: 15, fontWeight: '600' },
});
