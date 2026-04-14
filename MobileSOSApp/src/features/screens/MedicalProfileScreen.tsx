import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { API_BASE_URL } from '../../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    ActivityIndicator,
    Alert
} from 'react-native';

type MedicalProfileProps = {
    navigation: NativeStackNavigationProp<ParamListBase>;
};

export default function MedicalProfileScreen({ navigation }: MedicalProfileProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [medicalData, setMedicalData] = useState({
        bloodType: '',
        allergies: '',
        medications: '',
        conditions: ''
    });

    // 1. FETCH EXISTING DATA ON LOAD
    useEffect(() => {
        const fetchMedicalData = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                if (!token) return;

                const response = await fetch(`${API_BASE_URL}/users/profile`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    // If they have medical data, convert the MongoDB arrays back into readable comma-separated strings
                  if (data.medical) {
                    setMedicalData({
                      // Change from data.medical.bloodType to data.medical.bloodGroup
                      bloodType: data.medical.bloodGroup || '',
                      allergies: data.medical.allergies ? data.medical.allergies.join(', ') : '',
                      medications: data.medical.medications ? data.medical.medications.join(', ') : '',
                      conditions: data.medical.conditions ? data.medical.conditions.join(', ') : ''
                    });
                  }
                }
            } catch (error) {
                console.error("Failed to load medical profile:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMedicalData();
    }, []);

    // 2. SAVE EDITED DATA
    const handleSave = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            // Convert the comma-separated text box strings back into neat Arrays for MongoDB
          const formattedMedicalData = {
            // Send it as 'bloodGroup' and force it to be uppercase so Mongoose accepts it!
            bloodGroup: medicalData.bloodType ? medicalData.bloodType.trim().toUpperCase() : null,
            allergies: medicalData.allergies.split(',').map(item => item.trim()).filter(item => item !== ''),
            medications: medicalData.medications.split(',').map(item => item.trim()).filter(item => item !== ''),
            conditions: medicalData.conditions.split(',').map(item => item.trim()).filter(item => item !== '')
          };

            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ medical: formattedMedicalData }) 
            });

            if (response.ok) {
                navigation.goBack();
            } else {
                const err = await response.json();
                Alert.alert("Error", err.message || "Failed to update medical profile.");
            }
        } catch (error) {
            console.error("Network error during medical update:", error);
            Alert.alert("Error", "Network error. Please try again.");
        }
    };

    // Show a loading spinner while fetching
    if (isLoading) {
        return (
            <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#F40009" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Medical History</Text>
                        <Text style={styles.subtitle}>Update your vital health details to inform responders during an SOS event.</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Blood Type</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. O+, A-, AB+"
                            value={medicalData.bloodType} 
                            onChangeText={(t) => setMedicalData({...medicalData, bloodType: t})} 
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Allergies</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            placeholder="e.g. Peanuts, Penicillin (comma separated)"
                            multiline
                            numberOfLines={3}
                            value={medicalData.allergies} 
                            onChangeText={(t) => setMedicalData({...medicalData, allergies: t})} 
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Current Medications</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            placeholder="List any daily medications (comma separated)..."
                            multiline
                            numberOfLines={3}
                            value={medicalData.medications} 
                            onChangeText={(t) => setMedicalData({...medicalData, medications: t})} 
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Chronic Conditions</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            placeholder="e.g. Asthma, Diabetes (comma separated)"
                            multiline
                            numberOfLines={3}
                            value={medicalData.conditions} 
                            onChangeText={(t) => setMedicalData({...medicalData, conditions: t})} 
                        />
                    </View>

                    <Pressable style={styles.submitButton} onPress={handleSave}>
                        <Text style={styles.submitButtonText}>Save Changes</Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
    scrollContent: { padding: 24, flexGrow: 1, justifyContent: "center" },
    header: { marginBottom: 32 },
    title: { fontSize: 32, fontWeight: "800", color: "#0f1f39" },
    subtitle: { marginTop: 6, fontSize: 16, color: "#5a6072" },
    
    inputGroup: { marginBottom: 16 },
    label: { marginBottom: 6, color: "#32476b", fontWeight: "600" },
    input: { borderWidth: 1, borderColor: "#d8deec", borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: "white" },
    textArea: { height: 80, textAlignVertical: 'top' },
    
    submitButton: { backgroundColor: "#F40009", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 24, marginBottom: 40 },
    submitButtonText: { color: "white", fontSize: 18, fontWeight: "bold" }
});