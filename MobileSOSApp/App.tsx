import { StatusBar, StyleSheet, useColorScheme, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SettingsStack from './src/navigation/SettingsStack';
import HelperDispatchRuntime from './src/bootstrap/HelperDispatchRuntime';
import { flushPendingNavigation, navigationRef } from './src/navigation/navigationRef';
import { VictimSOSProvider } from './src/features/sos/VictimSOSContext';


import { Amplify } from 'aws-amplify';
import { COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID } from '@env';
import { getCurrentUser } from 'aws-amplify/auth';
import { getCurrentIdToken } from './src/services/appUser';

const ONBOARDING_SEEN_KEY = '@safeguard_has_seen_get_started';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: COGNITO_USER_POOL_ID,
      userPoolClientId: COGNITO_CLIENT_ID,
    }
  }
});

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  
  // State to hold the app on a loading screen while we check AWS
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // State to determine where the user should start
  const [initialRoute, setInitialRoute] = useState('AuthScreen');

  useEffect(() => {
    const checkBootstrapState = async () => {
      try {
        const onboardingSeen = (await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)) === 'true';

        if (!onboardingSeen) {
          setInitialRoute('GetStarted');
          return;
        }

        await getCurrentUser();
        const idToken = await getCurrentIdToken();

        if (!idToken) {
          throw new Error('Authenticated session is missing an ID token.');
        }

        setInitialRoute('MainDashboard');
      } catch {
        setInitialRoute('AuthScreen');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkBootstrapState();
  }, []);

  // Show a blank screen with a spinner while asking AWS for the token
  if (isCheckingAuth) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }]}>
        <ActivityIndicator size="large" color="#F40009" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer ref={navigationRef} onReady={flushPendingNavigation}>
        <VictimSOSProvider>
          {/* Pass the dynamic starting route down to your Navigator */}
          <SettingsStack initialRouteName={initialRoute} />
        </VictimSOSProvider>
      </NavigationContainer>
      <HelperDispatchRuntime />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default App;
