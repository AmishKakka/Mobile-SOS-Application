import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getStatusTone, getTrackingSnapshot } from '../services/socket';

const snapshot = getTrackingSnapshot();

export default function HelperMapScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.eyebrow}>Live Incident Tracking</Text>
            <View style={styles.connectionPill}>
              <View style={styles.connectionDot} />
              <Text style={styles.connectionText}>{snapshot.connectionState}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Incident {snapshot.incidentId}</Text>
          <Text style={styles.heroSubtitle}>
            {snapshot.helperCount} helpers visible within a {snapshot.coverageRadiusMeters}m
            coverage radius.
          </Text>
          <Text style={styles.syncText}>{snapshot.lastSyncLabel}</Text>
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapPlaceholder}>
            <View style={styles.radiusRing} />
            <View style={styles.userMarker}>
              <Text style={styles.userMarkerText}>YOU</Text>
            </View>
          </View>
          <Text style={styles.mapCaption}>
            Map placeholder for helper proximity and search radius overlays.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Responders</Text>
          <Text style={styles.sectionMeta}>{snapshot.helperCount} active</Text>
        </View>

        {snapshot.helpers.map((helper) => (
          <View key={helper.id} style={styles.helperCard}>
            <View style={styles.helperHeader}>
              <View>
                <Text style={styles.helperName}>{helper.name}</Text>
                <Text style={styles.helperMeta}>
                  {helper.distanceKm.toFixed(1)} km away • ETA {helper.etaMinutes} min
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusTone(helper.status)}18` },
                ]}
              >
                <Text style={[styles.statusText, { color: getStatusTone(helper.status) }]}>
                  {helper.status}
                </Text>
              </View>
            </View>

            <Text style={styles.helperUpdate}>Last update {helper.lastUpdated}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eyebrow: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  connectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13233e',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  connectionText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },
  syncText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
  },
  mapCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
  },
  mapPlaceholder: {
    height: 220,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  radiusRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#60a5fa',
    backgroundColor: '#bfdbfe55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarker: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1d4ed8',
  },
  userMarkerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  mapCaption: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionMeta: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  helperCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  helperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  helperName: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  helperMeta: {
    color: '#64748b',
    fontSize: 14,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  helperUpdate: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 12,
  },
});
