/**
 * Navigation principale RIPA
 * - LoaderScreen (7 s) puis :
 * - Token stocké et valide : UnlockScreen (PIN seul) → Home
 * - Connecté (PIN validé) : Home (+ écrans CTA)
 * - Pas de token ou token expiré : WelcomeScreen ; nouveaux → Register → OTP → Home ; déjà inscrits → Login (tél + PIN) → Home
 */
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApi } from '../context/ApiContext';
import { LoaderScreen } from '../screens/LoaderScreen';
import { UnlockScreen } from '../screens/UnlockScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { OTPScreen } from '../screens/OTPScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AddMobileMoneyScreen } from '../screens/AddMobileMoneyScreen';
import { OrderVirtualCardScreen } from '../screens/OrderVirtualCardScreen';
import { RegisterCardScreen } from '../screens/RegisterCardScreen';
import { KycScreen } from '../screens/KycScreen';
import { KycFormScreen } from '../screens/KycFormScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../constants/theme';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.primary },
  animation: 'slide_from_right',
};

/** Durée minimale d’affichage du LoaderScreen (révélation + bordure 2 tours) en ms */
const MIN_LOADER_DISPLAY_MS = 7000;

export function RootNavigator() {
  const { isLoading, isAuthenticated, needsPinUnlock } = useApi();
  const [minLoaderTimeReached, setMinLoaderTimeReached] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinLoaderTimeReached(true), MIN_LOADER_DISPLAY_MS);
    return () => clearTimeout(t);
  }, []);

  const showLoader = isLoading || !minLoaderTimeReached;

  if (showLoader) {
    return <LoaderScreen />;
  }

  const initialRoute = isAuthenticated ? 'Home' : needsPinUnlock ? 'Unlock' : 'Welcome';

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions} initialRouteName={initialRoute}>
        {needsPinUnlock ? (
          <Stack.Screen name="Unlock" component={UnlockScreen} />
        ) : isAuthenticated ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="AddMobileMoney" component={AddMobileMoneyScreen} />
            <Stack.Screen name="OrderVirtualCard" component={OrderVirtualCardScreen} />
            <Stack.Screen name="RegisterCard" component={RegisterCardScreen} />
            <Stack.Screen name="Kyc" component={KycScreen} />
            <Stack.Screen name="KycForm" component={KycFormScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="OTP" component={OTPScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
