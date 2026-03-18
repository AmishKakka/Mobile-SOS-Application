import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SettingsScreen from '../features/settings/screens/SettingsScreen';
import EditProfileScreen from '../features/settings/screens/EditProfileScreen';
import HelperDashboardScreen from '../features/settings/screens/HelperDashboardScreen';

import HelperGuidelinesScreen from '../features/settings/screens/HelperGuidelinesScreen'; 

const Stack = createNativeStackNavigator();

const SettingsStack = () => {
  return (
    <Stack.Navigator 
      initialRouteName="SettingsHome"
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#0f172a',
        headerTitleStyle: { fontWeight: 'bold' },
        headerBackTitleVisible: false, 
      }}
    >
      <Stack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="HelperDashboard" component={HelperDashboardScreen} options={{ title: 'Helper Dashboard', headerShadowVisible: false }} />
      
      {/* The single unified screen */}
      <Stack.Screen 
        name="HelperGuidelines" 
        component={HelperGuidelinesScreen} 
        options={{ title: 'Guidelines', headerShadowVisible: false, headerStyle: { backgroundColor: '#f9fafb' } }} 
      />

    </Stack.Navigator>
  );
};

export default SettingsStack;