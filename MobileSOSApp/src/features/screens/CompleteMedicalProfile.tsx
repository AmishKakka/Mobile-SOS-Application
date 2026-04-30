import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { API_BASE_URL } from '../../config/config';
import { fetchAuthSession } from 'aws-amplify/auth';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type CompleteMedicalProfileProps = {
    navigation: NativeStackNavigationProp<ParamListBase>;
};

export default function CompleteMedicalProfile({ navigation }: CompleteMedicalProfileProps) {
    const [medicalData, setMedicalData] = useState({
        bloodType: '',
        allergies: '',
        medications: '',
        conditions: ''
    });

    const handleSave = async () => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();
            const formattedMedicalData = {
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
                body: JSON.stringify({ 
                    medical: formattedMedicalData 
                }) 
            });

            if (response.ok) {
                navigation.replace('MainDashboard');
            } else {
                console.error("Medical profile update failed");
            }
        } catch (error) {
            console.error("Network error during medical update:", error);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    
                    {/* Top Nav & Progress */}
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>

                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, styles.progressActive]} />
                        <View style={[styles.progressBar, styles.progressActive]} />
                        <View style={[styles.progressBar, styles.progressActive]} />
                    </View>

                    <View style={styles.header}>
                        <Text style={styles.stepText}>STEP 3 OF 3: HEALTH DATA</Text>
                        <Text style={styles.title}>Medical History</Text>
                        <Text style={styles.subtitle}>Optional: Share vital health details to inform responders during an SOS event.</Text>
                    </View>

                    {/* Inputs */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Blood Type</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputIcon}>🩸</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="e.g. O+, A-, AB+"
                                placeholderTextColor="#c2b9b4"
                                value={medicalData.bloodType} 
                                onChangeText={(t) => setMedicalData({...medicalData, bloodType: t})} 
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Allergies</Text>
                        <View style={[styles.inputContainer, styles.textAreaContainer]}>
                            <TextInput 
                                style={[styles.input, styles.textArea]} 
                                placeholder="e.g. Peanuts, Penicillin"
                                placeholderTextColor="#c2b9b4"
                                multiline
                                numberOfLines={3}
                                value={medicalData.allergies} 
                                onChangeText={(t) => setMedicalData({...medicalData, allergies: t})} 
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Current Medications</Text>
                        <View style={[styles.inputContainer, styles.textAreaContainer]}>
                            <TextInput 
                                style={[styles.input, styles.textArea]} 
                                placeholder="List any daily medications..."
                                placeholderTextColor="#c2b9b4"
                                multiline
                                numberOfLines={3}
                                value={medicalData.medications} 
                                onChangeText={(t) => setMedicalData({...medicalData, medications: t})} 
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Chronic Conditions</Text>
                        <View style={[styles.inputContainer, styles.textAreaContainer]}>
                            <TextInput 
                                style={[styles.input, styles.textArea]} 
                                placeholder="e.g. Asthma, Diabetes"
                                placeholderTextColor="#c2b9b4"
                                multiline
                                numberOfLines={3}
                                value={medicalData.conditions} 
                                onChangeText={(t) => setMedicalData({...medicalData, conditions: t})} 
                            />
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <Pressable style={styles.submitButton} onPress={handleSave}>
                            <Text style={styles.submitButtonText}>Finish Setup ✓</Text>
                        </Pressable>
                        
                        {/* Optional skip button to match the theme */}
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={styles.skipText}>Skip for now</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#FAF9F6" },
    scrollContent: { padding: 24, flexGrow: 1 },
    
    backButton: { marginBottom: 20, marginTop: 10 },
    backIcon: { fontSize: 24, color: "#1A1A1A" },

    progressContainer: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    progressBar: { flex: 1, height: 4, backgroundColor: '#EBEBE6', borderRadius: 2 },
    progressActive: { backgroundColor: '#C82027' },

    header: { marginBottom: 24 },
    stepText: { fontSize: 12, fontWeight: "700", color: "#1E6594", marginBottom: 8, letterSpacing: 0.5 },
    title: { fontSize: 32, fontWeight: "800", color: "#1A1A1A", marginBottom: 8 },
    subtitle: { fontSize: 16, color: "#6B625B", lineHeight: 22 },
    
    inputGroup: { marginBottom: 20 },
    label: { marginBottom: 8, color: "#1A1A1A", fontWeight: "600", fontSize: 14 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F4F0', borderRadius: 14, paddingHorizontal: 16, height: 56 },
    inputIcon: { fontSize: 16, marginRight: 12, color: '#8b7a73' },
    input: { flex: 1, fontSize: 16, color: "#1A1A1A" },
    
    textAreaContainer: { height: 100, alignItems: 'flex-start', paddingTop: 16 },
    textArea: { textAlignVertical: 'top', height: '100%' },
    
    buttonContainer: { marginTop: 12, marginBottom: 40, alignItems: 'center' },
    submitButton: { backgroundColor: "#C82027", borderRadius: 14, paddingVertical: 18, alignItems: "center", width: '100%', marginBottom: 20 },
    submitButtonText: { color: "white", fontSize: 17, fontWeight: "700" },
    
    skipText: { color: '#1E6594', fontSize: 16, fontWeight: '600' }
});