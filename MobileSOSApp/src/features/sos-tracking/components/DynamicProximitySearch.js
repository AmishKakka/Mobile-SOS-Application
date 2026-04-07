import { Delete, Shield } from "lucide-react-native";
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width } = Dimensions.get('window');

export default function DynamicProximitySearch({ navigation, route }) {
    // --- 1. STATE MANAGEMENT ---
    const [radiusInMeters, setRadiusInMeters] = useState(250);
    const [isEscalated, setIsEscalated] = useState(false);
    const [showPinPrompt, setShowPinPrompt] = useState(false);
    const [pin, setPin] = useState("");

    const CORRECT_PIN = "1234";
    const socket = route.params?.socket;

    // Hardcoded location for UI consistency
    const userLocation = {
        latitude: 33.4156,
        longitude: -111.9261,
    };

    const mapRef = useRef(null);

    // --- 2. SOCKET & PIN LOGIC ---
    useEffect(() => {
        if (!socket) return;

        socket.on('search_expanded', (data) => {
            setRadiusInMeters(data.radius);
            if (mapRef.current) {
                const zoomDelta = (data.radius / 111000) * 2.5;
                mapRef.current.animateToRegion({
                    ...userLocation,
                    latitudeDelta: zoomDelta,
                    longitudeDelta: zoomDelta,
                }, 1000);
            }
        });

        socket.on('max_radius_reached', () => {
            setIsEscalated(true);
            trigger911Call();
        });

        return () => {
            socket.off('search_expanded');
            socket.off('max_radius_reached');
        };
    }, [socket]);

    // PIN Verification Logic
    useEffect(() => {
        if (pin.length === 4) {
            if (pin === CORRECT_PIN) {
                // SUCCESS: Go back to the Dashboard
                setPin("");
                setShowPinPrompt(false);
                navigation.navigate('MainDashboard');
            } else {
                // FAIL: Clear pin after short delay
                setTimeout(() => setPin(""), 300);
            }
        }
    }, [pin]);

    const handleKeyPress = (num) => {
        if (pin.length < 4) setPin(pin + num);
    };

    const handleDelete = () => {
        setPin(pin.slice(0, -1));
    };

    const trigger911Call = () => {
        Linking.openURL("tel:911").catch(() => Alert.alert("Error", "Could not open dialer."));
    };

    // --- 3. UI COMPONENTS ---

    const KeypadButton = ({ num, onPress, isIcon = false }) => (
        <TouchableOpacity style={styles.keypadBtn} onPress={onPress}>
            {isIcon ? <Delete color="#111827" size={28} /> : <Text style={styles.keypadNum}>{num ?? ''}</Text>}
        </TouchableOpacity>
    );


    // PIN SCREEN UI (Overlay)
    if (showPinPrompt) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.pinScreen}>
                    <View style={styles.shieldIconContainer}>
                        <Shield color="#FFF" size={32} />
                    </View>
                    <Text style={styles.pinTitle}>Security Verification</Text>
                    <Text style={styles.pinSub}>Enter your 4-digit PIN to cancel the emergency alert</Text>

                    <View style={styles.pinBoxContainer}>
                        {[0, 1, 2, 3].map((index) => (
                            <View key={`pin-${index}`} style={styles.pinBox}>
                                <Text style={styles.pinBoxText}>{pin[index] ? '•' : ''}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.keypadContainer}>
                        {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]].map((row, i) => (
                            <View key={i} style={styles.keypadRow}>
                                {row.map(num => <KeypadButton key={num} num={num} onPress={() => handleKeyPress(num)} />)}
                            </View>
                        ))}
                        <View style={styles.keypadRow}>
                            <View style={[styles.keypadBtn, { backgroundColor: 'transparent' }]} />
                            <KeypadButton num="0" onPress={() => handleKeyPress("0")} />
                            <KeypadButton isIcon onPress={handleDelete} />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.returnButton} onPress={() => { setShowPinPrompt(false); setPin(""); }}>
                        <Text style={styles.returnButtonText}>Return to SOS</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // MAIN SOS MAP UI
    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                    ...userLocation,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
            >
                <Marker coordinate={userLocation} pinColor="red" />
                {!isEscalated && (
                    <Circle
                        center={userLocation}
                        radius={radiusInMeters}
                        fillColor="rgba(220, 38, 38, 0.15)"
                        strokeColor="rgba(220, 38, 38, 0.8)"
                        strokeWidth={2}
                    />
                )}
            </MapView>

            <View style={styles.dashboard}>
                <Text style={styles.title}>
                    {isEscalated ? "⚠️ ESCALATION TRIGGERED" : "🚨 SOS ACTIVE"}
                </Text>
                <Text style={styles.status}>
                    {isEscalated ? "No helpers found. Calling 911..." : `Searching within ${radiusInMeters}m...`}
                </Text>

                <TouchableOpacity style={styles.callButton} onPress={trigger911Call}>
                    <Text style={styles.callButtonText}>CALL 911 NOW</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButtonLink} onPress={() => setShowPinPrompt(true)}>
                    <Text style={styles.cancelButtonText}>Cancel SOS</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    map: { width: width, height: Dimensions.get('window').height },
    dashboard: {
        position: 'absolute', bottom: 40, left: 20, right: 20,
        backgroundColor: 'white', padding: 20, borderRadius: 20,
        shadowColor: '#000', shadowOpacity: 0.2, elevation: 10, alignItems: 'center'
    },
    title: { fontSize: 22, fontWeight: '900', color: '#DC2626', marginBottom: 4 },
    status: { fontSize: 14, color: '#4B5563', textAlign: 'center', marginBottom: 20 },
    callButton: { backgroundColor: '#DC2626', paddingVertical: 16, borderRadius: 12, width: '100%', marginBottom: 10 },
    callButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    cancelButtonLink: { paddingVertical: 10 },
    cancelButtonText: { color: '#6B7280', fontSize: 16, textDecorationLine: 'underline' },

    /* PIN SCREEN STYLES (Copied from your working Dashboard) */
    pinScreen: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
    shieldIconContainer: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    pinTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
    pinSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 40 },
    pinBoxContainer: { flexDirection: 'row', justifyContent: 'center', width: '100%', marginBottom: 40 },
    pinBox: { width: 60, height: 75, backgroundColor: '#FFF', borderRadius: 12, marginHorizontal: 8, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.1, elevation: 4 },
    pinBoxText: { fontSize: 36, color: '#111827' },
    keypadContainer: { width: '100%', maxWidth: 320, marginBottom: 40 },
    keypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    keypadBtn: { width: (width - 120) / 3, height: 65, backgroundColor: '#F3F4F6', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    keypadNum: { fontSize: 28, fontWeight: '800', color: '#111827' },
    returnButton: { backgroundColor: '#DC2626', width: '100%', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
    returnButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});