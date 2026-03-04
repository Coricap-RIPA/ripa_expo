/**
 * Écran d'inscription – formulaire en 2 étapes
 *
 * Étape 1 : Nom, post-nom, prénom (icône identité, CTA Continuer)
 * Étape 2 : Téléphone (indicatif pays obligatoire), PIN 5 chiffres saisi 2 fois
 *           avec œil pour afficher/masquer ; validation correspondance PIN.
 *
 * Indicateurs d’étape : sous le formulaire (20 px d’écart), étape active = blanc.
 * Icônes FontAwesome pour titres et CTA. Charte RIPA respectée.
 */
import React, { useState } from 'react';
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
  Modal,
  Pressable,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import * as api from '../services/api';

const PHONE_PLACEHOLDER = '+243...';
const ICON_SIZE = 20;
const ICON_SIZE_TITLE = 22;

export function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [nom, setNom] = useState('');
  const [postNom, setPostNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [tel, setTel] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, message: '' });
  const [pendingUser, setPendingUser] = useState(null);

  const showError = (message) => {
    setErrorModal({ visible: true, message });
  };

  const canStep1 = nom.trim().length >= 2 && postNom.trim().length >= 2 && prenom.trim().length >= 2;
  const telClean = tel.replace(/\s/g, '');
  const phoneStartsWithPlus = /^\+[0-9]+$/.test(telClean) && telClean.length >= 10;
  const pinOk = pin.length === 5 && /^[0-9]+$/.test(pin);
  const pinMatch = pin === pinConfirm;
  const canStep2 = phoneStartsWithPlus && pinOk && pinMatch;

  const onNext = () => {
    if (!canStep1) {
      showError('Nom, post-nom et prénom doivent contenir au moins 2 caractères.');
      return;
    }
    setStep(2);
  };

  const onSubmit = async () => {
    if (!phoneStartsWithPlus) {
      showError('Le numéro doit commencer par l’indicatif pays (ex. +243 pour la RDC).');
      return;
    }
    if (!pinOk) {
      showError('Le code PIN doit contenir exactement 5 chiffres.');
      return;
    }
    if (!pinMatch) {
      showError('Les deux codes PIN ne correspondent pas. Vérifiez la saisie.');
      return;
    }
    setLoading(true);
    setErrorModal({ visible: false, message: '' });
    try {
      const res = await api.register({
        nom: nom.trim(),
        post_nom: postNom.trim(),
        prenom: prenom.trim(),
        tel: telClean,
        pin,
      });
      if (res.success && res.data?.user) {
        setPendingUser(res.data.user);
        navigation.replace('OTP', { userId: res.data.user.id, otpCode: res.data.otp_code });
      } else {
        showError(res.message || 'Erreur lors de l\'inscription.');
      }
    } catch (e) {
      showError(e.message || 'Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => setErrorModal((prev) => ({ ...prev, visible: false }));

  return (
    <>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Barre supérieure : uniquement bouton Retour à l’étape 2 */}
        <View style={styles.header}>
          {step === 2 ? (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <FontAwesome5 name="arrow-left" size={ICON_SIZE} color={colors.secondary} style={styles.backBtnIcon} />
              <Text style={styles.backBtnText}>Retour</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}
          <View style={styles.backBtnPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Titre avec icône */}
          <View style={styles.titleRow}>
            <FontAwesome5
              name={step === 1 ? 'user' : 'shield-alt'}
              size={ICON_SIZE_TITLE}
              color={colors.tertiary}
              style={styles.titleIcon}
            />
            <Text style={styles.title}>{step === 1 ? 'Votre identité' : 'Contact et sécurité'}</Text>
          </View>
          <Text style={styles.subtitle}>
            {step === 1
              ? 'Saisissez vos noms pour commencer.'
              : 'Numéro avec indicatif pays (+243…) et code PIN à 5 chiffres (saisi 2 fois).'}
          </Text>

          {step === 1 ? (
            <View style={styles.form}>
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Nom</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex. Kabongo"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={nom}
                  onChangeText={setNom}
                  autoCapitalize="words"
                  selectionColor={colors.secondary}
                />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Post-nom</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex. Mukendi"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={postNom}
                  onChangeText={setPostNom}
                  autoCapitalize="words"
                  selectionColor={colors.secondary}
                />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Prénom</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex. Jean"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={prenom}
                  onChangeText={setPrenom}
                  autoCapitalize="words"
                  selectionColor={colors.secondary}
                />
              </View>
              <TouchableOpacity
                style={[styles.cta, !canStep1 && styles.ctaDisabled]}
                onPress={onNext}
                disabled={!canStep1}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>Continuer</Text>
                <FontAwesome5 name="arrow-right" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Téléphone (indicatif pays obligatoire)</Text>
                <View style={styles.inputRow}>
                  <FontAwesome5 name="phone-alt" size={18} color="rgba(255,255,255,0.6)" style={styles.inputLeftIcon} />
                  <TextInput
                    style={[styles.input, styles.inputWithIcon]}
                    placeholder={PHONE_PLACEHOLDER}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={tel}
                    onChangeText={(t) => {
                      const v = t.replace(/\s/g, '');
                      if (v === '') setTel('');
                      else if (v.startsWith('+')) setTel(v);
                      else setTel('+' + v);
                    }}
                    keyboardType="phone-pad"
                    selectionColor={colors.secondary}
                  />
                </View>
                {tel.length > 0 && !tel.startsWith('+') && (
                  <Text style={styles.hintError}>Commencez par l’indicatif pays (ex. +243)</Text>
                )}
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Code PIN (5 chiffres)</Text>
                <View style={styles.inputRow}>
                  <FontAwesome5 name="lock" size={18} color="rgba(255,255,255,0.6)" style={styles.inputLeftIcon} />
                  <TextInput
                    style={[styles.input, styles.inputWithIcon, styles.inputWithRightBtn]}
                    placeholder="•••••"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={pin}
                    onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 5))}
                    keyboardType="number-pad"
                    secureTextEntry={!showPin}
                    maxLength={5}
                    selectionColor={colors.secondary}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPin((s) => !s)} hitSlop={12}>
                    <FontAwesome5 name={showPin ? 'eye-slash' : 'eye'} size={18} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Confirmer le PIN</Text>
                <View style={styles.inputRow}>
                  <FontAwesome5 name="lock" size={18} color="rgba(255,255,255,0.6)" style={styles.inputLeftIcon} />
                  <TextInput
                    style={[styles.input, styles.inputWithIcon, styles.inputWithRightBtn]}
                    placeholder="•••••"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={pinConfirm}
                    onChangeText={(t) => setPinConfirm(t.replace(/\D/g, '').slice(0, 5))}
                    keyboardType="number-pad"
                    secureTextEntry={!showPinConfirm}
                    maxLength={5}
                    selectionColor={colors.secondary}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPinConfirm((s) => !s)} hitSlop={12}>
                    <FontAwesome5 name={showPinConfirm ? 'eye-slash' : 'eye'} size={18} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>
                </View>
                {pinConfirm.length === 5 && pin !== pinConfirm && (
                  <Text style={styles.hintError}>Les deux codes PIN ne correspondent pas.</Text>
                )}
              </View>
              <TouchableOpacity style={styles.ctaSecondary} onPress={() => setStep(1)} activeOpacity={0.85}>
                <FontAwesome5 name="user-edit" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIconLeft} />
                <Text style={styles.ctaSecondaryText}>Modifier mon identité</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cta, (!canStep2 || loading) && styles.ctaDisabled]}
                onPress={onSubmit}
                disabled={!canStep2 || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={colors.tertiary} />
                ) : (
                  <>
                    <Text style={styles.ctaText}>Créer mon compte</Text>
                    <FontAwesome5 name="user-plus" size={ICON_SIZE} color={colors.tertiary} style={styles.ctaIcon} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Indicateurs d’étape : sous le formulaire, 20 px d’écart ; actif = blanc */}
          <View style={styles.stepDotsWrap}>
            <View style={[styles.dot, step === 1 && styles.dotActive]} />
            <View style={[styles.dot, step === 2 && styles.dotActive]} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={errorModal.visible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Attention</Text>
            <Text style={styles.modalText}>{errorModal.message}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={closeModal} activeOpacity={0.85}>
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backBtnIcon: {
    marginRight: 8,
  },
  backBtnText: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  backBtnPlaceholder: {
    width: 80,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleIcon: {
    marginRight: 10,
  },
  title: {
    color: colors.tertiary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    marginBottom: 28,
  },
  form: {},
  fieldWrap: {
    marginBottom: 20,
  },
  label: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    color: colors.tertiary,
    borderWidth: 1,
    borderColor: 'rgba(165,154,247,0.35)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  inputLeftIcon: {
    position: 'absolute',
    left: 18,
    zIndex: 1,
  },
  inputWithIcon: {
    paddingLeft: 46,
    flex: 1,
    minWidth: 0,
  },
  inputWithRightBtn: {
    paddingRight: 46,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    padding: 8,
    zIndex: 1,
  },
  hintError: {
    color: '#ffb3b3',
    fontSize: 13,
    marginTop: 6,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 18,
    borderRadius: 14,
    marginTop: 12,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: colors.tertiary,
    fontSize: 17,
    fontWeight: 'bold',
  },
  ctaIcon: {
    marginLeft: 10,
  },
  ctaIconLeft: {
    marginRight: 10,
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  ctaSecondaryText: {
    color: colors.tertiary,
    fontSize: 16,
    fontWeight: '600',
  },
  /** Indicateurs sous le formulaire, 20 px au-dessus */
  stepDotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 6,
  },
  dotActive: {
    backgroundColor: colors.tertiary,
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: colors.tertiary,
    borderRadius: 20,
    padding: 24,
    shadowColor: colors.fourth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalText: {
    color: colors.fourth,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  modalBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    color: colors.tertiary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
