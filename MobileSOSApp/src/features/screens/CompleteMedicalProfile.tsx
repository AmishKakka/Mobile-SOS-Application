import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

    const handleSave = () => {
        console.log("Saving complete medical profile...", medicalData);
        // Execute final backend API save here
        navigation.replace('MainDashboard');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Medical History</Text>
                        <Text style={styles.subtitle}>Optional: Share vital health details to inform responders during an SOS event.</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Blood Type (Optional)</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. O+, A-, AB+"
                            value={medicalData.bloodType} 
                            onChangeText={(t) => setMedicalData({...medicalData, bloodType: t})} 
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Allergies (Optional)</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            placeholder="e.g. Peanuts, Penicillin"
                            multiline
                            numberOfLines={3}
                            value={medicalData.allergies} 
                            onChangeText={(t) => setMedicalData({...medicalData, allergies: t})} 
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Current Medications (Optional)</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            placeholder="List any daily medications..."
                            multiline
                            numberOfLines={3}
                            value={medicalData.medications} 
                            onChangeText={(t) => setMedicalData({...medicalData, medications: t})} 
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Chronic Conditions (Optional)</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            placeholder="e.g. Asthma, Diabetes"
                            multiline
                            numberOfLines={3}
                            value={medicalData.conditions} 
                            onChangeText={(t) => setMedicalData({...medicalData, conditions: t})} 
                        />
                    </View>

                    <Pressable style={styles.submitButton} onPress={handleSave}>
                        <Text style={styles.submitButtonText}>Save & Complete Setup</Text>
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