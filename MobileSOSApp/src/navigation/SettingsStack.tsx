import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

// --- Auth & Onboarding Imports (Industry Standard Path) ---
import GetStartedScreen from '../features/auth/GetStartedScreen';
import LocationAccessScreen from '../features/auth/LocationAccessScreen';
import AuthScreen from '../features/auth/AuthScreen';

// --- Other Feature Imports (From the screens folder to maintain modularity) ---
import EditProfileScreen from '../features/screens/EditProfileScreen';
import EmergencyContactsScreen from '../features/screens/EmergencyContactsScreen';
import HelperDashboardScreen from '../features/screens/HelperDashBoard';
import SettingsScreen from '../features/screens/SettingsScreen';
import MainDashboard from '../features/screens/MainDashboard';
import HelperGuidelinesScreen from '../features/screens/HelperGuidelines';
import DynamicProximitySearch from '../features/sos-tracking/components/DynamicProximitySearch';

const Stack = createNativeStackNavigator();

const SettingsStack = () => {
  return (
    <Stack.Navigator 
      initialRouteName="GetStarted"
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#0f172a',
        headerTitleStyle: { fontWeight: 'bold' },
        headerShadowVisible: true,
      }}
    >
      {/* 1. ONBOARDING FLOW (Figma Specs) */}
      <Stack.Screen 
        name="GetStarted" 
        component={GetStartedScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="LocationAccess" 
        component={LocationAccessScreen} 
        options={{ headerShown: false }} 
      />

      {/* 2. AUTHENTICATION */}
      <Stack.Screen 
        name="AuthScreen" 
        component={AuthScreen} 
        options={{ headerShown: false }} 
      />

      {/* 3. CORE APP SCREENS */}
      <Stack.Screen 
        name="MainDashboard" 
        component={MainDashboard} 
        options={{ headerShown: false }} 
      />

      <Stack.Screen 
        name="EmergencySearch" 
        component={DynamicProximitySearch as any} 
        options={{ 
            headerShown: false, 
            gestureEnabled: false 
        }} 
      />

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