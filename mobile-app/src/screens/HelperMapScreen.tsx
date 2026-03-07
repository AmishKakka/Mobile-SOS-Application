import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { socket } from "../services/socket";

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

export default function HelperMapScreen() {
  // ✅ ALL HOOKS FIRST (no conditional returns before this)
  const mapRef = useRef<MapView | null>(null);

  const [status, setStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const [victimCoord, setVictimCoord] = useState<Coord>(INITIAL);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const statusLabel = useMemo(() => {
    if (status === "connected") return "Connected";
    if (status === "error") return "Error";
    return "Disconnected";
  }, [status]);

  useEffect(() => {
    if (Platform.OS === "web") return; // ✅ no return before hooks; effect just does nothing on web

    if (!socket.connected) socket.connect();

    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");
    const onConnectError = () => setStatus("error");

    const onReceive = (payload: any) => {
      const latitude = Number(payload?.latitude ?? payload?.lat);
      const longitude = Number(payload?.longitude ?? payload?.lng ?? payload?.long);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

      const next: Coord = { latitude, longitude };
      setVictimCoord(next);
      setLastUpdated(Date.now());

      const region: Region = { ...next, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      mapRef.current?.animateToRegion(region, 350);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("receive_sos_location", onReceive);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("receive_sos_location", onReceive);
      socket.disconnect();
    };
  }, []);

  const updatedText = lastUpdated
    ? `Updated ${Math.max(1, Math.round((Date.now() - lastUpdated) / 1000))}s ago`
    : "Waiting for location…";

  const centerOnVictim = () => {
    mapRef.current?.animateToRegion(
      { ...victimCoord, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      350
    );
  };

  // ✅ Conditional UI AFTER hooks is fine
  if (Platform.OS === "web") {
    return (
      <View style={styles.webFallback}>
        <Text style={styles.webText}>
          This PoC map works on iOS/Android (react-native-maps is native-only).
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MapView
        ref={(r) => { mapRef.current = r; }}  // ✅ TS-safe
        style={StyleSheet.absoluteFillObject}
        initialRegion={{ ...INITIAL, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        showsCompass={false}
        showsScale={false}
        showsTraffic={false}
        showsBuildings={false}
        showsPointsOfInterest={false}
        mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
      >
        <Marker coordinate={victimCoord} anchor={{ x: 0.5, y: 0.5 }}>
          <SosMarker />
        </Marker>
      </MapView>

      <SafeAreaView style={styles.chrome}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Helper</Text>
            <Text style={styles.headerSub}>Live SOS Tracking</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.fabColumn}>
          <Pressable style={styles.fab} onPress={centerOnVictim}>
            <Text style={styles.fabText}>Center</Text>
          </Pressable>
        </View>

        <View style={styles.bottomCard}>
          <Text style={styles.cardTitle}>Active SOS</Text>
          <Text style={styles.cardRow}>{updatedText}</Text>
          <Text style={styles.cardRow}>
            Lat {victimCoord.latitude.toFixed(5)} • Lon {victimCoord.longitude.toFixed(5)}
          </Text>
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
    backgroundColor: "rgba(15,15,18,0.75)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.8)", marginTop: 2, fontSize: 12 },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  statusDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: "#9aa0a6" },
  statusText: { color: "white", fontSize: 12, fontWeight: "600" },

  fabColumn: { position: "absolute", right: 16, top: 110 },
  fab: { backgroundColor: "rgba(15,15,18,0.80)", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14 },
  fabText: { color: "white", fontWeight: "700", fontSize: 12 },

  bottomCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(15,15,18,0.82)",
  },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "800" },
  cardRow: { color: "rgba(255,255,255,0.85)", marginTop: 6, fontSize: 12 },

  markerWrap: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  markerOuter: { position: "absolute", width: 28, height: 28, borderRadius: 999, backgroundColor: "rgba(255,59,48,0.25)" },
  markerInner: { width: 12, height: 12, borderRadius: 999, backgroundColor: "#ff3b30", borderWidth: 2, borderColor: "white" },

  webFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  webText: { fontSize: 14 },
});