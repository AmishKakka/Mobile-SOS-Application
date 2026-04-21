import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { Send, AlertTriangle, Camera } from 'lucide-react-native';

export default function LocationAccessScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.stepHeader}>STEP 2 OF 5: PERSONAL DETAILS</Text>
        <View style={styles.iconRow}>
          <View style={styles.blueIcon}>
            <Send color="#3B82F6" size={36} />
          </View>
          <View style={[styles.blueIcon, { marginLeft: -18, backgroundColor: '#DBEAFE', zIndex: -1 }]}>
            <Camera color="#1D4ED8" size={36} />
          </View>
        </View>

        <Text style={styles.title}>Permissions Required</Text>
        <Text style={styles.desc}>
          SafeGuard needs access to your device location and camera to ensure total safety during an SOS event.
        </Text>

        <View style={styles.warningBox}>
          <AlertTriangle color="#B45309" size={26} />
          <View style={styles.wTextCol}>
            <Text style={styles.wTitle}>Background Location Access</Text>
            <Text style={styles.wDesc}>
              We require background access to ensure your coordinates are sent even if your screen is locked.
            </Text>
          </View>
        </View>

        <View style={{ width: '100%' }}>
          <TouchableOpacity
            style={styles.allowBtn}
            onPress={() => navigation.replace('AuthScreen')}
          >
            <Text style={styles.allowText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#FAFAFA' },
  stepHeader:    { color: '#1E3A5F', fontWeight: '800', fontSize: 12, marginBottom: 8, letterSpacing: 0.5 },
  content:    { flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
  iconRow:    { flexDirection: 'row', marginBottom: 25 },
  blueIcon:   { backgroundColor: '#EFF6FF', padding: 22, borderRadius: 100, elevation: 5 },
  title:      { fontSize: 26, fontWeight: '900', color: '#111827', textAlign: 'center' },
  desc:       { color: '#6B7280', textAlign: 'center', marginTop: 12, lineHeight: 24, fontSize: 15, fontWeight: '500' },
  warningBox: { flexDirection: 'row', backgroundColor: '#FFFBEB', borderLeftWidth: 5, borderLeftColor: '#F59E0B', padding: 18, borderRadius: 15, marginTop: 35, width: '100%' },
  wTextCol:   { marginLeft: 14, flex: 1 },
  wTitle:     { fontWeight: '800', color: '#92400E', fontSize: 15 },
  wDesc:      { color: '#B45309', fontSize: 13, marginTop: 4, lineHeight: 18, fontWeight: '500' },
  allowBtn:   { backgroundColor: '#1E3A5F', width: '100%', padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 45, elevation: 6 },
  allowText:  { color: '#FFF', fontWeight: '900', fontSize: 16 },
  skipBtn:    { marginTop: 18, alignSelf: 'center' },
  skipText:   { color: '#9CA3AF', fontWeight: '800', fontSize: 14 },
});
