import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Platform,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getSocket } from "../src/services/socket";

type Coord = { latitude: number; longitude: number };
const INITIAL: Coord = { latitude: 37.7749, longitude: -122.4194 };

function SosMarker() {
  return (
    <View style={styles.markerWrap}>
      <View style={styles.markerOuter} />
      <View style={styles.markerInner} />
    </View>
  );
}

export default function TrackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ incidentId?: string; title?: string }>();
  const incidentId = params.incidentId ?? "INC-UNKNOWN";
  const title = params.title ?? "Active SOS";

  const mapRef = useRef<MapView | null>(null);
  const [status, setStatus] = useState<"connected" | "disconnected" | "error">(
    "disconnected"
  );
  const [victimCoord, setVictimCoord] = useState<Coord>(INITIAL);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const statusLabel = useMemo(() => {
    if (status === "connected") return "Connected";
    if (status === "error") return "Error";
    return "Disconnected";
  }, [status]);

  useEffect(() => {
    // Web fallback (still ok because hooks already ran)
    if (Platform.OS === "web") return;

    const socket = getSocket();

    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");
    const onConnectError = () => setStatus("error");

    const onReceive = (payload: any) => {
      // Supports {latitude, longitude} or {lat, lng}
      const latitude = Number(payload?.latitude ?? payload?.lat);
      const longitude = Number(payload?.longitude ?? payload?.lng ?? payload?.long);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

      const next = { latitude, longitude };
      setVictimCoord(next);
      setLastUpdated(Date.now());

      const region: Region = { ...next, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      mapRef.current?.animateToRegion(region, 300);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("receive_sos_location", onReceive);

    if (!socket.connected) socket.connect();



    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("receive_sos_location", onReceive);
      socket.disconnect(); // PoC
    };
  }, [incidentId]);

  const centerOnVictim = () => {
    mapRef.current?.animateToRegion(
      { ...victimCoord, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      300
    );
  };

  const updatedText = lastUpdated
    ? `Updated ${Math.max(1, Math.round((Date.now() - lastUpdated) / 1000))}s ago`
    : "Waiting for location…";

  if (Platform.OS === "web") {
    return (
      <View style={styles.webFallback}>
        <Text style={styles.webText}>
          Tracking map works on iOS/Android (react-native-maps is native-only).
        </Text>
        <Pressable style={styles.webBtn} onPress={() => router.back()}>
          <Text style={{ color: "white", fontWeight: "800" }}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MapView
        ref={(r) => {
          mapRef.current = r;
        }}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{ ...INITIAL, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        showsCompass={false}
        showsScale={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
      >
        <Marker coordinate={victimCoord} anchor={{ x: 0.5, y: 0.5 }}>
          <SosMarker />
        </Marker>
      </MapView>

      <SafeAreaView style={styles.chrome}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.headerSub}>Incident: {incidentId}</Text>
          </View>

          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                status === "connected"
                  ? styles.dotGreen
                  : status === "error"
                  ? styles.dotRed
                  : styles.dotGray,
              ]}
            />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        {/* Floating button */}
        <Pressable style={styles.fab} onPress={centerOnVictim}>
          <Text style={styles.fabText}>Center</Text>
        </Pressable>

        {/* Bottom card */}
        <View style={styles.bottomCard}>
          <Text style={styles.cardTitle}>Live Location</Text>
          <Text style={styles.cardRow}>{updatedText}</Text>
          <Text style={styles.cardRow}>
            Lat {victimCoord.latitude.toFixed(5)} • Lon {victimCoord.longitude.toFixed(5)}
          </Text>
          <Pressable style={styles.primaryBtn} onPress={centerOnVictim}>
            <Text style={styles.primaryBtnText}>Track</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "black" },
  chrome: { flex: 1 },

  header: {
    marginTop: 8,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(15,15,18,0.78)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  backText: { color: "white", fontWeight: "800", fontSize: 12 },
  headerTitle: { color: "white", fontSize: 15, fontWeight: "900" },
  headerSub: { color: "rgba(255,255,255,0.7)", marginTop: 2, fontSize: 11 },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  statusDot: { width: 8, height: 8, borderRadius: 999 },
  dotGreen: { backgroundColor: "#2ecc71" },
  dotRed: { backgroundColor: "#ff3b30" },
  dotGray: { backgroundColor: "#9aa0a6" },
  statusText: { color: "white", fontSize: 12, fontWeight: "700" },

  fab: {
    position: "absolute",
    right: 16,
    top: 110,
    backgroundColor: "rgba(15,15,18,0.85)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  fabText: { color: "white", fontWeight: "800", fontSize: 12 },

  bottomCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(15,15,18,0.85)",
  },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "900" },
  cardRow: { color: "rgba(255,255,255,0.85)", marginTop: 6, fontSize: 12 },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: "#ff3b30",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "900" },

  markerWrap: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  markerOuter: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(255,59,48,0.25)",
  },
  markerInner: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#ff3b30",
    borderWidth: 2,
    borderColor: "white",
  },

  webFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 12 },
  webText: { fontSize: 14, textAlign: "center" },
  webBtn: { backgroundColor: "#111", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
});