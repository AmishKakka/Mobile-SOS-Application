import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import AuthScreen from '../features/auth/AuthScreen';
import EditProfileScreen from '../features/screens/EditProfileScreen';
import EmergencyContactsScreen from '../features/screens/EmergencyContactsScreen';
import HelperDashboardScreen from '../features/screens/HelperDashBoard';
import HelperSOSNotificationScreen from '../features/screens/HelperSOSNotificationScreen';
import HelperTrackingScreen from '../features/screens/HelperTrackingScreen';
import SOSCompletionScreen from '../features/screens/SOSCompletionScreen';
import SettingsScreen from '../features/screens/SettingsScreen';
import MainDashboard from '../features/screens/MainDashboard';
import HelperGuidelinesScreen from '../features/screens/HelperGuidelines';
import DynamicProximitySearch from '../features/sos-tracking/components/DynamicProximitySearch';

const Stack = createNativeStackNavigator();

const SettingsStack = () => {
  return (
    <Stack.Navigator 
      initialRouteName="AuthScreen"
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#0f172a',
        headerTitleStyle: { fontWeight: 'bold' },
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen name="AuthScreen" component={AuthScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MainDashboard" component={MainDashboard} options={{ headerShown: false }} />

      <Stack.Screen 
        name="EmergencySearch" 
        component={DynamicProximitySearch as any} 
        options={{ 
            headerShown: false, 
            gestureEnabled: false // This prevents the user from accidentally swiping back during an emergency
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
      <Stack.Screen
        name="HelperSOSNotification"
        component={HelperSOSNotificationScreen as any}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="HelperTracking"
        component={HelperTrackingScreen as any}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="SOSCompletion"
        component={SOSCompletionScreen as any}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default SettingsStack;