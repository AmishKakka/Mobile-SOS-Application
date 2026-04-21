import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

// Auth & Onboarding
import GetStartedScreen from '../features/auth/GetStartedScreen';
import LocationAccessScreen from '../features/auth/LocationAccessScreen';
import AuthScreen from '../features/auth/AuthScreen';

// New onboarding steps from friend's branch
import PersonalDetailsScreen from '../features/auth/PersonalDetailsScreen';
import MedicalInfoScreen from '../features/auth/MedicalInfoScreen';
import SetupPinScreen from '../features/auth/SetupPinScreen';

// Core screens
import MainDashboard from '../features/screens/MainDashboard';
import SOSActiveScreen from '../features/screens/SOSActiveScreen';
import SOSHistoryScreen from '../features/screens/SOSHistoryScreen';
import SettingsScreen from '../features/screens/SettingsScreen';
import EditProfileScreen from '../features/screens/EditProfileScreen';
import MedicalProfileScreen from '../features/screens/MedicalProfileScreen';
import EmergencyContactsScreen from '../features/screens/EmergencyContactsScreen';

// Profile completion
import CompleteProfile from '../features/screens/CompleteProfile';
import CompleteMedicalProfile from '../features/screens/CompleteMedicalProfile';
import AddEmergencyContacts from '../features/screens/AddEmergencyContacts';

// Helper flow
import HelperDashboardScreen from '../features/screens/HelperDashBoard';
import HelperGuidelinesScreen from '../features/screens/HelperGuidelines';
import HelperSOSNotificationScreen from '../features/screens/HelperSOSNotificationScreen';
import HelperTrackingScreen from '../features/screens/HelperTrackingScreen';
import SOSCompletionScreen from '../features/screens/SOSCompletionScreen';
import DynamicProximitySearch from '../features/sos-tracking/components/DynamicProximitySearch';

const Stack = createNativeStackNavigator();

type SettingsStackProps = {
  initialRouteName?: string;
};

const SettingsStack = ({ initialRouteName }: SettingsStackProps) => {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName ?? 'GetStarted'}
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#0f172a',
        headerTitleStyle: { fontWeight: 'bold' },
        headerShadowVisible: true,
      }}
    >
      {/* ── Onboarding ── */}
      <Stack.Screen name="GetStarted"     component={GetStartedScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="LocationAccess" component={LocationAccessScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="AuthScreen"     component={AuthScreen}            options={{ headerShown: false }} />

      {/* New simple onboarding steps (friend's branch) */}
      <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MedicalInfo"     component={MedicalInfoScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="SetupPin"        component={SetupPinScreen}        options={{ headerShown: false }} />

      {/* Cognito-backed profile completion (existing) */}
      <Stack.Screen name="CompleteProfile"        component={CompleteProfile}        options={{ title: 'Complete Profile' }} />
      <Stack.Screen name="AddEmergencyContacts"   component={AddEmergencyContacts}   options={{ title: 'Add Emergency Contacts' }} />
      <Stack.Screen name="CompleteMedicalProfile" component={CompleteMedicalProfile} options={{ title: 'Medical Profile' }} />

      {/* ── Core ── */}
      <Stack.Screen name="MainDashboard" component={MainDashboard} options={{ headerShown: false }} />
      <Stack.Screen name="SOSHistory"    component={SOSHistoryScreen} options={{ title: 'Neighbourhood Activity' }} />

      {/* Victim SOS active screen — swipe-back disabled during emergency */}
      <Stack.Screen
        name="SOSActive"
        component={SOSActiveScreen as any}
        options={{ headerShown: false, gestureEnabled: false }}
      />

      {/* ── Settings ── */}
      <Stack.Screen name="SettingsHome"  component={SettingsScreen}        options={{ title: 'Settings' }} />
      <Stack.Screen name="EditProfile"   component={EditProfileScreen}      options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="MedicalProfile" component={MedicalProfileScreen} options={{ title: 'Medical Profile' }} />
      <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} options={{ title: 'Emergency Contacts' }} />

      {/* ── Helper flow ── */}
      <Stack.Screen name="HelperDashboard"   component={HelperDashboardScreen}  options={{ title: 'Helper Dashboard', headerShadowVisible: false }} />
      <Stack.Screen name="HelperGuidelines"  component={HelperGuidelinesScreen} options={{ title: 'Guidelines', headerShadowVisible: false, headerStyle: { backgroundColor: '#f9fafb' } }} />
      <Stack.Screen
        name="EmergencySearch"
        component={DynamicProximitySearch as any}
        options={{ headerShown: false, gestureEnabled: false }}
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
