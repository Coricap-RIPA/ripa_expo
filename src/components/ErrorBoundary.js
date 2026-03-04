/**
 * Error Boundary – affiche un message lisible en cas de crash au lieu de l’écran générique Expo.
 * Permet de recharger l’app (Reload) sans quitter Expo Go.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Une erreur s’est produite</Text>
          <Text style={styles.message}>
            Vous pouvez revenir à l’accueil Expo ou recharger le projet.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.buttonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: { color: colors.tertiary, fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  message: { color: colors.secondary, fontSize: 16, textAlign: 'center', marginBottom: 24 },
  button: {
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  buttonText: { color: colors.tertiary, fontWeight: 'bold' },
});
