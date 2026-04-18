import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import AuthScreen from '../features/auth/AuthScreen';
import GetStartedScreen from '../features/auth/GetStartedScreen';
import LocationAccessScreen from '../features/auth/LocationAccessScreen';
import EditProfileScreen from '../features/screens/EditProfileScreen';
import EmergencyContactsScreen from '../features/screens/EmergencyContactsScreen';
import MedicalProfileScreen from '../features/screens/MedicalProfileScreen';
import HelperDashboardScreen from '../features/screens/HelperDashBoard';
import HelperSOSNotificationScreen from '../features/screens/HelperSOSNotificationScreen';
import HelperTrackingScreen from '../features/screens/HelperTrackingScreen';
import SOSCompletionScreen from '../features/screens/SOSCompletionScreen';
import SOSActiveScreen from '../features/screens/SOSActiveScreen';
import SettingsScreen from '../features/screens/SettingsScreen';
import MainDashboard from '../features/screens/MainDashboard';
import HelperGuidelinesScreen from '../features/screens/HelperGuidelines';
import DynamicProximitySearch from '../features/sos-tracking/components/DynamicProximitySearch';
import CompleteProfile from '../features/screens/CompleteProfile';
import CompleteMedicalProfile from '../features/screens/CompleteMedicalProfile';
import AddEmergencyContacts from '../features/screens/AddEmergencyContacts';

const Stack = createNativeStackNavigator();

// DD TYPE DEFINITION
type SettingsStackProps = {
  initialRouteName: string;
};

// ACCEPT THE PROP FROM APP.TSX
const SettingsStack = ({ initialRouteName }: SettingsStackProps) => {
  return (
    <Stack.Navigator 
      // USE THE DYNAMIC ROUTE HERE
      initialRouteName={initialRouteName == null ? "GetStarted" : initialRouteName}
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#0f172a',
        headerTitleStyle: { fontWeight: 'bold' },
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen name="GetStarted" component={GetStartedScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LocationAccess" component={LocationAccessScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AuthScreen" component={AuthScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfile} options={{ title: 'Complete Profile'}}/>
      <Stack.Screen name="AddEmergencyContacts" component={AddEmergencyContacts} options={{ title: 'Add Emergency Contacts'}}/>
      <Stack.Screen name="CompleteMedicalProfile" component={CompleteMedicalProfile} options={{ title: 'Medical Profile' }} />
      <Stack.Screen name="MainDashboard" component={MainDashboard} options={{ headerShown: false }} />
      <Stack.Screen
        name="SOSActive"
        component={SOSActiveScreen as any}
        options={{ headerShown: false, gestureEnabled: false }}
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
        name="MedicalProfile"
        component={MedicalProfileScreen}
        options={{ title: 'Medical Profile' }}
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
