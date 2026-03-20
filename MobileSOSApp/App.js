import React, { useState } from 'react';
import { SafeAreaView, Button, View, Text } from 'react-native';
import DynamicProximitySearch from './src/features/sos-tracking/components/DynamicProximitySearch';

// 1. THE FAKE BACKEND (Mock Socket)
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

        // --- THE BACKEND SIMULATION TIMELINE ---

        setTimeout(() => {
            socket.simulateBackendFiring('search_expanded', { radius: 250 });
        }, 2000);

        setTimeout(() => {
            socket.simulateBackendFiring('search_expanded', { radius: 500 });
        }, 4000);

        setTimeout(() => {
            socket.simulateBackendFiring('search_expanded', { radius: 1000 });
        }, 6000);

        setTimeout(() => {
            socket.simulateBackendFiring('search_expanded', { radius: 1500 });
        }, 8000);

        setTimeout(() => {
            socket.simulateBackendFiring('max_radius_reached');
        }, 10000);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
            {!isSosActive ? (
                <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
                    <Text style={{ fontSize: 24, textAlign: 'center', marginBottom: 30 }}>
                        Sprint 4: Radar Simulation
                    </Text>
                    <Button title="🚨 SIMULATE SOS TRIGGER" onPress={triggerTestSOS} color="red" />
                </View>
            ) : (
                <DynamicProximitySearch
                    socket={mockSocket}
                    incidentId="test_incident_999"
                    onCancel={() => setIsSosActive(false)}
                />
            )}
        </SafeAreaView>
    );
}