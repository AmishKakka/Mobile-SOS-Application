import { StatusBar, StyleSheet, useColorScheme, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import SettingsStack from './src/navigation/SettingsStack';


import { Amplify } from 'aws-amplify';
import { COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID } from '@env';
import { getCurrentUser } from 'aws-amplify/auth';

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
    const checkUserSession = async () => {
      try {
        // Ask AWS if someone is currently logged in on this phone
        await getCurrentUser();
        
        // If the above line doesn't throw an error, the user is logged in.
        // Skip the AuthScreen and re-direct them right into the main app.
        setInitialRoute('MainDashboard'); 
      } catch (error) {
        // If it throws an error. Send them to the login screen.
        setInitialRoute('AuthScreen');
      } finally {
        // Turn off the loading spinner
        setIsCheckingAuth(false);
      }
    };

    checkUserSession();
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
      <NavigationContainer>
        {/* Pass the dynamic starting route down to your Navigator */}
        <SettingsStack initialRouteName={initialRoute} />
      </NavigationContainer>
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