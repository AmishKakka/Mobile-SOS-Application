import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Linking, 
    Animated, 
    Easing 
} from 'react-native';

export default function DynamicProximitySearch({ socket, incidentId, onCancel }) {
    // State to manage the UI text and escalation phase
    const [searchRadius, setSearchRadius] = useState('250 meters');
    const [statusMessage, setStatusMessage] = useState('Alerting nearby helpers...');
    const [isEscalated, setIsEscalated] = useState(false);

    // Animation value for the "Radar Pulse" effect
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // 1. Start the repeating radar animation
        startPulseAnimation();

        // 2. Listen for the backend expanding the Uber H3 radius
        socket.on('search_expanded', (data) => {
            // Expected data from backend: { radius: '500 meters', message: 'Expanding search...' }
            setSearchRadius(data.radius);
            setStatusMessage('No one accepted yet. Expanding search area...');
        });

        // 3. Listen for the absolute failure event (2-mile limit reached)
        socket.on('max_radius_reached', () => {
            handleAutoEscalation();
        });

        // Cleanup listeners when component unmounts
        return () => {
            socket.off('search_expanded');
            socket.off('max_radius_reached');
        };
    }, []);

    const startPulseAnimation = () => {
        pulseAnim.setValue(0);
        Animated.loop(
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 2000,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            })
        ).start();
    };

    // The core logic for your Sprint Task
    const handleAutoEscalation = () => {
        setIsEscalated(true);
        setStatusMessage('No helpers available in your area.');
        
        // This is the native API that forces the phone's dial pad to open
        // with 911 pre-filled. It does NOT automatically place the call (OS restriction),
        // but it puts the user one tap away from safety.
        Linking.openURL('tel:911').catch((err) => 
            console.error('Error opening dialer:', err)
        );
    };

    // Calculate animation styles
    const pulseStyle = {
        transform: [{
            scale: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 3] // Expands from 1x to 3x size
            })
        }],
        opacity: pulseAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 0] // Fades out as it expands
        })
    };

    return (
        <View style={styles.container}>
            {!isEscalated ? (
                // --- PHASE 1: SEARCHING FOR HELPERS ---
                <View style={styles.searchingContainer}>
                    <View style={styles.radarWrapper}>
                        <Animated.View style={[styles.pulseCircle, pulseStyle]} />
                        <View style={styles.centerDot} />
                    </View>
                    
                    <Text style={styles.statusTitle}>Searching...</Text>
                    <Text style={styles.statusMessage}>{statusMessage}</Text>
                    <Text style={styles.radiusText}>Current Radius: {searchRadius}</Text>
                    
                    <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                        <Text style={styles.cancelBtnText}>Cancel SOS</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                // --- PHASE 2: AUTO-ESCALATION (NO HELPERS FOUND) ---
                <View style={styles.escalatedContainer}>
                    <Text style={styles.alertIcon}>⚠️</Text>
                    <Text style={styles.escalatedTitle}>Community Unavailable</Text>
                    <Text style={styles.statusMessage}>
                        We expanded the search to 2 miles but could not find an available helper.
                    </Text>

                    <TouchableOpacity 
                        style={styles.emergencyBtn} 
                        onPress={() => Linking.openURL('tel:911')}
                    >
                        <Text style={styles.emergencyBtnText}>Call 911 Now</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.contactBtn}>
                        <Text style={styles.contactBtnText}>Text Emergency Contacts</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 },
    searchingContainer: { alignItems: 'center', width: '100%' },
    escalatedContainer: { alignItems: 'center', width: '100%', padding: 20, backgroundColor: '#ffebee', borderRadius: 15 },
    
    // Radar Animation Styles
    radarWrapper: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
    pulseCircle: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: '#ef5350' },
    centerDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#d32f2f', elevation: 5 },
    
    // Typography
    statusTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    escalatedTitle: { fontSize: 24, fontWeight: 'bold', color: '#d32f2f', marginBottom: 15, textAlign: 'center' },
    statusMessage: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 10 },
    radiusText: { fontSize: 18, fontWeight: '600', color: '#1976d2', marginTop: 10, marginBottom: 30 },
    alertIcon: { fontSize: 50, marginBottom: 10 },
    
    // Buttons
    cancelBtn: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, backgroundColor: '#eeeeee' },
    cancelBtnText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
    emergencyBtn: { width: '100%', padding: 18, borderRadius: 10, backgroundColor: '#d32f2f', alignItems: 'center', marginBottom: 15, marginTop: 20 },
    emergencyBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    contactBtn: { width: '100%', padding: 18, borderRadius: 10, backgroundColor: '#fff', borderWidth: 2, borderColor: '#d32f2f', alignItems: 'center' },
    contactBtnText: { color: '#d32f2f', fontSize: 18, fontWeight: 'bold' }
});