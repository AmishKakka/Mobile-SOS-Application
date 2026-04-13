import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import SettingsStack from './src/navigation/SettingsStack';
import HelperDispatchRuntime from './src/bootstrap/HelperDispatchRuntime';
import { flushPendingNavigation, navigationRef } from './src/navigation/navigationRef';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer ref={navigationRef} onReady={flushPendingNavigation}>
        <SettingsStack />
      </NavigationContainer>
      <HelperDispatchRuntime />
    </SafeAreaProvider>
  );
}

export default App;
