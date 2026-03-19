import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import EditProfileScreen from '../features/settings/screens/EditProfileScreen';
import EmergencyContactsScreen from '../features/settings/screens/EmergencyContactsScreen';
import HelperDashboardScreen from '../features/settings/screens/HelperDashBoard';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import MainDashboard from '../features/sos-tracking/components/MainDashboard';

import HelperGuidelinesScreen from '../features/settings/screens/HelperGuidelines';

const Stack = createNativeStackNavigator();

const SettingsStack = () => {
  return (
    <Stack.Navigator 
      initialRouteName="MainDashboard"
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#0f172a',
        headerTitleStyle: { fontWeight: 'bold' },
        headerShadowVisible: true,}}
    >
    <Stack.Screen name="MainDashboard" component={MainDashboard} options={{ headerShown: false }} />
    <Stack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: 'Settings' }} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
    <Stack.Screen name="HelperDashboard" component={HelperDashboardScreen} options={{ title: 'Helper Dashboard', headerShadowVisible: false }} />
    
    <Stack.Screen 
      name="HelperGuidelines" 
      component={HelperGuidelinesScreen} 
      options={{ title: 'Guidelines', headerShadowVisible: false, headerStyle: { backgroundColor: '#f9fafb' } }} 
    />

    <Stack.Screen
      name="EmergencyContacts"
      component={EmergencyContactsScreen}
      options={{ title: 'Emergency Contacts' }}
    />

    </Stack.Navigator>
  );
};

export default SettingsStack;