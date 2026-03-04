/**
 * Écran de bienvenue (première ouverture, utilisateur non connecté)
 *
 * Design :
 * - Image de fond ripawelcomescreen.png à 100 % du fond
 * - Dégradé par-dessus (transparent → semi-opaque) pour garder l’image visible
 * - Logo, titre, sous-titre et CTA « Démarrer ici » → Inscription
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/theme';
import { logos } from '../constants/assets';

/** Image de fond : assets/images/ripawelcomescreen.png */
const welcomeBackground = require('../../assets/images/ripawelcomescreen.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function WelcomeScreen({ navigation }) {
  const onStart = () => {
    if (navigation?.replace) {
      navigation.replace('Register');
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={welcomeBackground}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Dégradé : plus sombre en haut → plus clair vers le bas */}
        <LinearGradient
          colors={[
            'rgba(39, 3, 69, 0.85)',
            'rgba(39, 3, 69, 0.5)',
            'rgba(39, 3, 69, 0.2)',
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.content}>
          <View style={styles.logoWrap}>
            <Image source={logos.onDark} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.title}>Bienvenue sur RIPA</Text>
          <Text style={styles.subtitle}>
            Gérez vos cartes Visa et Mastercard, rechargez par mobile money, faite vos paiements en toute
            simplicité.
          </Text>
          <TouchableOpacity style={styles.cta} onPress={onStart} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Créer un compte</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaSecondary} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={styles.ctaSecondaryText}>J'ai déjà un compte</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  /** Image de fond à 100 % de l’écran (cover pour remplir tout le fond) */
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 48,
  },
  logoWrap: {
    alignSelf: 'center',
    width: '55%',
    maxWidth: 200,
    aspectRatio: 2.2,
    marginBottom: 28,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    color: colors.tertiary,
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.tertiary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 36,
    textAlign: 'center',
    opacity: 0.95,
  },
  cta: {
    backgroundColor: colors.secondary,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: colors.fourth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaText: {
    color: colors.tertiary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  ctaSecondary: {
    marginTop: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.tertiary,
    borderRadius: 14,
  },
  ctaSecondaryText: {
    color: colors.tertiary,
    fontSize: 16,
    fontWeight: '600',
  },
});
