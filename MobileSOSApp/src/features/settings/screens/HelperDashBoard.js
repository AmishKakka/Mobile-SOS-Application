import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';

const HelperDashboardScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.shieldIcon}>🛡️</Text>
          </View>
          <Text style={styles.title}>Community Helper</Text>
          <Text style={styles.subtitle}>Ready to make a difference in your community</Text>
        </View>

        <View style={[styles.card, styles.shadow]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Active & Ready</Text>
              <Text style={styles.cardSubtitle}>You're available to help nearby emergencies</Text>
            </View>
            <View style={styles.greenDot} />
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

        {/* Pass params to tell the next screen which accordion to open! */}
        <InfoCard 
          emoji="👥" 
          title="Community First" 
          desc="Be there for your neighbors when they need help the most" 
          bg="#f3f4f6" 
          onPress={() => navigation.navigate('HelperGuidelines', { openSection: 'community' })} 
        />
        
        <InfoCard 
          emoji="📍" 
          title="Save Lives" 
          desc="Your quick response can make the difference in emergencies" 
          bg="#fef2f2" 
          onPress={() => navigation.navigate('HelperGuidelines', { openSection: 'savelives' })} 
        />
        
        <InfoCard 
          emoji="🤝" 
          title="Build Trust" 
          desc="Grow your reputation as a reliable community helper" 
          bg="#f3f4f6" 
          onPress={() => navigation.navigate('HelperGuidelines', { openSection: 'trust' })} 
        />

      </ScrollView>
    </SafeAreaView>
  );
};

const InfoCard = ({ emoji, title, desc, bg, onPress }) => (
  <TouchableOpacity style={[styles.infoCard, styles.shadow]} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.infoIconBox, { backgroundColor: bg }]}>
      <Text style={styles.infoEmoji}>{emoji}</Text>
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
  shieldIcon: { fontSize: 28 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  greenDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', marginTop: 5 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  statCol: { alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  infoCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' },
  infoIconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoEmoji: { fontSize: 20 },
  infoTextContainer: { flex: 1 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  infoDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  shadow: { shadowColor: '#9ca3af', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 }
});

export default HelperDashboardScreen;