import React, { useState } from 'react';
import { SafeAreaView, Button, View, Text } from 'react-native';
import DynamicProximitySearch from './src/features/sos-tracking/components/DynamicProximitySearch';

const createMockSocket = () => {
    const listeners = {};
    return {
        on: (event, callback) => { listeners[event] = callback; },
        off: (event) => { delete listeners[event]; },
        simulateBackendFiring: (event, data) => {
            if (listeners[event]) listeners[event](data);
        }
    };
};

export default function App() {
    const [isSosActive, setIsSosActive] = useState(false);
    const [mockSocket, setMockSocket] = useState(null);

    const triggerTestSOS = () => {
        const socket = createMockSocket();
        setMockSocket(socket);
        setIsSosActive(true);
        
        // 1. After 3 seconds, simulate the backend expanding to Ring 1
        setTimeout(() => {
            console.log("Backend Simulator: Expanding to 500 meters...");
            socket.simulateBackendFiring('search_expanded', { radius: '500 meters' });
        }, 3000);

        // 2. After 6 seconds, simulate expanding to Ring 2
        setTimeout(() => {
            console.log("Backend Simulator: Expanding to 1 mile...");
            socket.simulateBackendFiring('search_expanded', { radius: '1 mile' });
        }, 6000);

        // 3. After 9 seconds, simulate the total failure (triggers the 911 UI)
        setTimeout(() => {
            console.log("Backend Simulator: Max radius reached. Triggering escalation!");
            socket.simulateBackendFiring('max_radius_reached');
        }, 9000);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center' }}>
            {!isSosActive ? (
                <View style={{ padding: 20 }}>
                    <Text style={{ fontSize: 20, textAlign: 'center', marginBottom: 20 }}>
                        Isolated Component Test
                    </Text>
                    <Button title="🚨 SIMULATE SOS TRIGGER" onPress={triggerTestSOS} color="red" />
                </View>
            ) : (
                // Render YOUR component and feed it the fake socket!
                <DynamicProximitySearch 
                    socket={mockSocket} 
                    incidentId="test_incident_999" 
                    onCancel={() => setIsSosActive(false)} 
                />
            )}
        </SafeAreaView>
    );
}