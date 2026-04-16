import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { getTrackingSnapshot } from '../src/services/socket';

const snapshot = getTrackingSnapshot();

const summaryItems = [
  { label: 'Open Incident', value: snapshot.incidentId },
  { label: 'Connected Helpers', value: `${snapshot.helperCount}` },
  { label: 'Coverage Radius', value: `${snapshot.coverageRadiusMeters}m` },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>Mobile SOS Console</Text>
        <Text style={styles.title}>Responder dashboard scaffold</Text>
        <Text style={styles.subtitle}>
          A lightweight starting point for monitoring nearby helpers and preparing a
          dedicated tracking flow.
        </Text>

        <View style={styles.summaryGrid}>
          {summaryItems.map((item) => (
            <View key={item.label} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.calloutCard}>
          <Text style={styles.calloutTitle}>Tracking route ready</Text>
          <Text style={styles.calloutText}>
            Open the `track` route to preview the responder list, incident banner, and
            search-radius map placeholder.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef2ff',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  eyebrow: {
    color: '#4338ca',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    color: '#0f172a',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 12,
  },
  subtitle: {
    color: '#475569',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
  },
  summaryGrid: {
    gap: 14,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  summaryValue: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
  },
  calloutCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 24,
    padding: 20,
  },
  calloutTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  calloutText: {
    color: '#c7d2fe',
    fontSize: 14,
    lineHeight: 21,
  },
});
