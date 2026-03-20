import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Linking, Alert, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';

export default function DynamicProximitySearch({ socket, incidentId, onCancel }) {
    // --- 1. STATE MANAGEMENT ---
    const [radiusInMeters, setRadiusInMeters] = useState(250); // Start at 250m
    const [statusText, setStatusText] = useState("Broadcasting to nearby community...");
    const [isEscalated, setIsEscalated] = useState(false); // Tracks if 911 mode is active

    // For testing, we hardcode the user's location (e.g., Central Park)
    // In production, this would come from your device's actual GPS
    const userLocation = {
        latitude: 40.7812,
        longitude: -73.9665,
    };

    // We use a "ref" to control the map (e.g., automatically zooming out as the circle grows)
    const mapRef = useRef(null);

    // --- 2. THE SOCKET LISTENER (The Brains) ---
    useEffect(() => {
        if (!socket) return;

        // Listener A: The backend expanded the search ring!
        socket.on('search_expanded', (data) => {
            console.log(`[Socket] Expanding radar to ${data.radius} meters`);

            // 1. Update the radius state (this makes the red circle physically grow on the map)
            setRadiusInMeters(data.radius);

            // 2. Update the text the user sees
            setStatusText(`Expanded search to ${data.radius}m. Still looking...`);

            // 3. Automatically zoom the map out so the new, larger circle fits on the screen!
            if (mapRef.current) {
                // We calculate a rough "zoom level" based on the radius
                const zoomDelta = (data.radius / 111000) * 2.5;
                mapRef.current.animateToRegion({
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: zoomDelta,
                    longitudeDelta: zoomDelta,
                }, 1000); // Animate the zoom over 1 second
            }
        });

        // Listener B: Total failure. No helpers found after maximum expansion.
        socket.on('max_radius_reached', () => {
            console.log("[Socket] Max radius reached. Escalating to 911.");
            setIsEscalated(true);
            setStatusText("No community helpers available.");
            trigger911Call(); // Automatically trigger the phone dialer!
        });

        // Cleanup: Stop listening when the component unmounts
        return () => {
            socket.off('search_expanded');
            socket.off('max_radius_reached');
        };
    }, [socket]); // This hook only re-runs if the 'socket' object changes

    // --- 3. NATIVE HARDWARE INTERACTION (The 911 Dialer) ---
    const trigger911Call = () => {
        const emergencyNumber = "tel:911";

        // We skip the 'canOpenURL' check entirely to bypass modern OS security blocks.
        // We just force the OS to handle the 'tel:' link directly!
        Linking.openURL(emergencyNumber)
            .catch(err => {
                console.error("An error occurred trying to dial 911", err);
                Alert.alert("Error", "Could not open the phone dialer.");
            });
    };

    // --- 4. THE UI RENDER ---
    return (
        <View style={styles.container}>
            {/* The Map Layer */}
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.01, // Initial tight zoom
                    longitudeDelta: 0.01,
                }}
                showsUserLocation={true} // Shows the little blue dot if GPS is enabled
            >
                {/* A pin showing exactly where the SOS happened */}
                <Marker coordinate={userLocation} pinColor="red" />

                {/* The Radar Ring. It re-renders instantly every time 'radiusInMeters' changes! */}
                {!isEscalated && (
                    <Circle
                        center={userLocation}
                        radius={radiusInMeters}
                        fillColor="rgba(255, 0, 0, 0.15)" // Transparent red inside
                        strokeColor="rgba(255, 0, 0, 0.8)" // Solid red border
                        strokeWidth={2}
                    />
                )}
            </MapView>

            {/* The Floating Status Dashboard */}
            <View style={[styles.dashboard, isEscalated ? styles.dashboardEscalated : null]}>
                <Text style={styles.title}>
                    {isEscalated ? "⚠️ ESCALATION TRIGGERED" : "🚨 SOS ACTIVE"}
                </Text>

                <Text style={styles.status}>{statusText}</Text>

                {!isEscalated && (
                    <Text style={styles.radiusText}>Current Radar: {radiusInMeters}m</Text>
                )}

                {/* Manual 911 Override Button (Always good to have a backup!) */}
                <TouchableOpacity style={styles.callButton} onPress={trigger911Call}>
                    <Text style={styles.callButtonText}>CALL 911 NOW</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelButtonText}>Cancel SOS</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// --- 5. STYLES ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
    dashboard: {
        position: 'absolute', bottom: 40, left: 20, right: 20,
        backgroundColor: 'white', padding: 20, borderRadius: 15,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8,
        alignItems: 'center'
    },
    dashboardEscalated: {
        backgroundColor: '#ffebee', // Light red background when escalated
        borderColor: 'red', borderWidth: 2
    },
    title: { fontSize: 22, fontWeight: 'bold', color: '#d32f2f', marginBottom: 8 },
    status: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 10 },
    radiusText: { fontSize: 16, fontWeight: '700', color: '#555', marginBottom: 15 },
    callButton: {
        backgroundColor: '#d32f2f', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, width: '100%', marginBottom: 10
    },
    callButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    cancelButton: { paddingVertical: 10 },
    cancelButtonText: { color: '#666', fontSize: 16, textDecorationLine: 'underline' }
});