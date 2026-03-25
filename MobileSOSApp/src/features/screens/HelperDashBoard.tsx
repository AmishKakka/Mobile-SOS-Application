import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Shield, Siren, Users, MapPin, Handshake } from 'lucide-react-native';

type NavigationLike = { navigate: (screen: string, params?: Record<string, any>) => void };

type HelperDashboardScreenProps = { navigation: NavigationLike };

const HelperDashboardScreen: React.FC<HelperDashboardScreenProps> = ({ navigation }) => {
  const [isAvailable, setIsAvailable] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Shield color="#FFF" size={28} />
          </View>
          <Text style={styles.title}>Community Helper</Text>
          <Text style={styles.subtitle}>Ready to make a difference in your community</Text>
        </View>

        <View style={[styles.card, styles.shadow]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>
                {isAvailable ? 'Active & Ready' : 'Not Available'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {isAvailable
                  ? "You're available to help nearby emergencies"
                  : "You're currently not accepting SOS requests"}
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: '#D1D5DB', true: '#BBF7D0' }}
              thumbColor={isAvailable ? '#22c55e' : '#9CA3AF'}
            />
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, {color: '#111827'}]}>12</Text>
              <Text style={styles.statLabel}>Helped</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, {color: '#111827'}]}>2.5</Text>
              <Text style={styles.statLabel}>Avg Response</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, {color: '#d32f2f'}]}>4.9</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.simulateButton,
            styles.shadow,
            !isAvailable && styles.simulateButtonDisabled,
          ]}
          activeOpacity={isAvailable ? 0.8 : 1}
          disabled={!isAvailable}
          onPress={() =>
            navigation.navigate('HelperSOSNotification', {
              victimName: 'Sarah M.',
              victimLocation: { latitude: 33.4152, longitude: -111.9263 },
              distance: '0.8 km',
              incidentType: 'Medical Emergency',
            })
          }
        >
          <View style={[styles.simulateIconBox, !isAvailable && { backgroundColor: '#E5E7EB' }]}>
            <Siren color={isAvailable ? '#DC2626' : '#9CA3AF'} size={22} />
          </View>
          <View style={styles.simulateTextContainer}>
            <Text style={[styles.simulateTitle, !isAvailable && { color: '#9CA3AF' }]}>
              Simulate Incoming SOS
            </Text>
            <Text style={styles.simulateDesc}>
              {isAvailable ? 'Test the helper response flow' : 'Toggle availability to enable'}
            </Text>
          </View>
        </TouchableOpacity>

        <InfoCard 
          icon={<Users color="#374151" size={20} />}
          title="Community First" 
          desc="Be there for your neighbors when they need help the most" 
          bg="#f3f4f6" 
          onPress={() => navigation.navigate('HelperGuidelines', { openSection: 'community' })} 
        />
        
        <InfoCard 
          icon={<MapPin color="#DC2626" size={20} />}
          title="Save Lives" 
          desc="Your quick response can make the difference in emergencies" 
          bg="#fef2f2" 
          onPress={() => navigation.navigate('HelperGuidelines', { openSection: 'savelives' })} 
        />
        
        <InfoCard 
          icon={<Handshake color="#374151" size={20} />}
          title="Build Trust" 
          desc="Grow your reputation as a reliable community helper" 
          bg="#f3f4f6" 
          onPress={() => navigation.navigate('HelperGuidelines', { openSection: 'trust' })} 
        />

      </ScrollView>
    </SafeAreaView>
  );
};

type InfoCardProps = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  bg?: string;
  onPress?: () => void;
};

const InfoCard: React.FC<InfoCardProps> = ({ icon, title, desc, bg, onPress }) => (
  <TouchableOpacity style={[styles.infoCard, styles.shadow]} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.infoIconBox, { backgroundColor: bg }]}>
      {icon}
    </View>
    <View style={styles.infoTextContainer}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoDesc}>{desc}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: 24 },
  header: { alignItems: 'center', marginBottom: 32, marginTop: 10 },
  iconCircle: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#d32f2f', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardHeaderText: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  statCol: { alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  infoCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' },
  infoIconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoTextContainer: { flex: 1 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  infoDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  shadow: { shadowColor: '#9ca3af', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  simulateButton: { flexDirection: 'row', backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#FECACA', borderStyle: 'dashed' },
  simulateButtonDisabled: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  simulateIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  simulateTextContainer: { flex: 1 },
  simulateTitle: { fontSize: 16, fontWeight: '700', color: '#DC2626', marginBottom: 2 },
  simulateDesc: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
});

export default HelperDashboardScreen;
