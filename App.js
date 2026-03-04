/**
 * RIPA – Point d'entrée de l'application
 * Charge les polices (Microgramma Bold, Roboto Regular), affiche le splash,
 * puis affiche le contenu avec ApiProvider et la navigation.
 */

/**
 * Debug : après le LoaderScreen, l’app s’arrête sur le WelcomeScreen (pour valider le design).
 * Mettre à false pour enchaîner avec le flux normal (navigation Register, OTP, Home, etc.).
 */
const SHOW_LOADER_THEN_WELCOME_DEBUG = false;

import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiProvider } from './src/context/ApiContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { LoaderScreen } from './src/screens/LoaderScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { colors } from './src/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Polices optionnelles : ne pas require() si les .ttf sont absents (évite crash Expo Go).
        // Quand vous ajoutez les fichiers dans assets/fonts/microgramma/ et roboto/, décommentez ci‑dessous.
        // await Font.loadAsync({
        //   MicrogrammaBoldExtended: require('./assets/fonts/microgramma/MicrogrammaDBoldExtended.ttf'),
        //   Roboto: require('./assets/fonts/roboto/Roboto-Regular.ttf'),
        //   RobotoBold: require('./assets/fonts/roboto/Roboto-Bold.ttf'),
        // });
      } catch (e) {
        console.warn('Erreur chargement polices:', e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  const [loaderDone, setLoaderDone] = useState(false);

  useEffect(() => {
    if (appIsReady && SHOW_LOADER_THEN_WELCOME_DEBUG) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.tertiary} />
      </View>
    );
  }

  if (SHOW_LOADER_THEN_WELCOME_DEBUG) {
    if (!loaderDone) {
      return (
        <>
          <StatusBar style="light" />
          <LoaderScreen onComplete={() => setLoaderDone(true)} />
        </>
      );
    }
    return (
      <>
        <StatusBar style="light" />
        <WelcomeScreen navigation={{ replace: () => {} }} />
      </>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider onLayout={onLayoutRootView}>
        <ApiProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </ApiProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
