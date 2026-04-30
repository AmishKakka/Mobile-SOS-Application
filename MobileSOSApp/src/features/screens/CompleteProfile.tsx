import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { API_BASE_URL } from '../../config/config';
import React, { useState, useMemo } from 'react';
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
import { fetchAuthSession } from 'aws-amplify/auth';

type CompleteProfileProps = {
    navigation: NativeStackNavigationProp<ParamListBase>;
};

export default function CompleteProfile({ navigation }: CompleteProfileProps) {
    const [formData, setFormData] = useState({
        phone: '',
        address: '',
        height: '',
        weight: ''
    });

    // Converts "1234567890" to "(123) 456-7890"
    const handlePhoneChange = (text: string) => {
        const cleaned = text.replace(/\D/g, '').substring(0, 10);
        let formatted = cleaned;
        if (cleaned.length > 3 && cleaned.length <= 6) {
            formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
        } else if (cleaned.length > 6) {
            formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        setFormData({ ...formData, phone: formatted });
    };

    // Phone Number is required, and it must be exactly 10 digits
    const canSubmit = useMemo(() => {
        const rawDigits = formData.phone.replace(/\D/g, '');
        return rawDigits.length === 10;
    }, [formData.phone]);

    const handleNext = async () => {
        if (!canSubmit) return;

        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();

            if (!token) {
                console.error("No token found. User might not be logged in.");
                return;
            }

            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    phone: formData.phone,
                    address: formData.address,
                    height: formData.height,
                    weight: formData.weight
                }) 
            });

            if (response.ok) {
                navigation.navigate('AddEmergencyContacts');
            } else {
                const errorData = await response.json();
                console.error("Profile update failed:", errorData);
            }
        } catch (error) {
            console.error("Network error during profile update:", error);
        }
    };

    const handleChangePhoto = () => {
        console.log("Trigger OS Image Picker...");
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    
                    {/* Top Nav & Progress */}
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>

                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, styles.progressActive]} />
                        <View style={styles.progressBar} />
                        <View style={styles.progressBar} />
                    </View>

                    <View style={styles.header}>
                        <Text style={styles.stepText}>STEP 1 OF 3: PERSONAL DETAILS</Text>
                        <Text style={styles.title}>Complete your profile</Text>
                        <Text style={styles.subtitle}>Tell us who you are, so we can help you faster. Responders use this info to identify and reach you quickly.</Text>
                    </View>

                    {/* Photo Upload */}
                    <View style={styles.photoWrapper}>
                        <View style={styles.photoCircle}>
                            {/* Placeholder for User Icon */}
                            <Text style={{fontSize: 40, color: '#8b7a73'}}>👤</Text> 
                        </View>
                        <TouchableOpacity style={styles.cameraBadge} onPress={handleChangePhoto}>
                            {/* Placeholder for Camera Icon */}
                            <Text style={{fontSize: 16, color: '#fff'}}>📷</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Inputs */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputIcon}>📞</Text>
                            <TextInput 
                                style={styles.input} 
                                keyboardType="phone-pad" 
                                placeholder="(555) 000-0000"
                                placeholderTextColor="#c2b9b4"
                                value={formData.phone} 
                                onChangeText={handlePhoneChange} 
                                maxLength={14}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Home Address</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputIcon}>📍</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="123 Main St, Apt 4B"
                                placeholderTextColor="#c2b9b4"
                                value={formData.address} 
                                onChangeText={(t) => setFormData({...formData, address: t})} 
                            />
                        </View>
                        <View style={styles.helperTextContainer}>
                            <Text style={styles.helperIcon}>ℹ️</Text>
                            <Text style={styles.helperText}>Used for location-based alerts</Text>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, {flex: 1, marginRight: 12}]}>
                            <Text style={styles.label}>Height</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>↕</Text>
                                <TextInput style={styles.input} placeholder="5'10&quot;" placeholderTextColor="#c2b9b4" value={formData.height} onChangeText={(t) => setFormData({...formData, height: t})} />
                            </View>
                        </View>
                        <View style={[styles.inputGroup, {flex: 1}]}>
                            <Text style={styles.label}>Weight (lbs)</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>⚖</Text>
                                <TextInput style={styles.input} keyboardType="numeric" placeholder="160" placeholderTextColor="#c2b9b4" value={formData.weight} onChangeText={(t) => setFormData({...formData, weight: t})} />
                            </View>
                        </View>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <Pressable 
                            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} 
                            onPress={handleNext}
                            disabled={!canSubmit}
                        >
                            <Text style={styles.submitButtonText}>Next: Medical Info →</Text>
                        </Pressable>

                        <TouchableOpacity onPress={() => navigation.navigate('AddEmergencyContacts')}>
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

    header: { marginBottom: 12 },
    stepText: { fontSize: 12, fontWeight: "700", color: "#1E6594", marginBottom: 8, letterSpacing: 0.5 },
    title: { fontSize: 32, fontWeight: "800", color: "#1A1A1A", marginBottom: 8 },
    subtitle: { fontSize: 16, color: "#6B625B", lineHeight: 22 },
    
    photoWrapper: { alignSelf: 'center', marginVertical: 32, position: 'relative' },
    photoCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#F2F2EC', justifyContent: 'center', alignItems: 'center' },
    cameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#C82027', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FAF9F6' },

    inputGroup: { marginBottom: 20 },
    label: { marginBottom: 8, color: "#1A1A1A", fontWeight: "600", fontSize: 14 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F4F0', borderRadius: 14, paddingHorizontal: 16, height: 56 },
    inputIcon: { fontSize: 16, marginRight: 12, color: '#8b7a73' },
    input: { flex: 1, fontSize: 16, color: "#1A1A1A" },
    
    helperTextContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 2 },
    helperIcon: { fontSize: 12, marginRight: 6 },
    helperText: { fontSize: 12, color: '#5C5550' },

    row: { flexDirection: 'row', justifyContent: 'space-between' },
    
    buttonContainer: { marginTop: 20, marginBottom: 40, alignItems: 'center' },
    submitButton: { backgroundColor: "#C82027", borderRadius: 14, paddingVertical: 18, alignItems: "center", width: '100%', marginBottom: 20 },
    submitButtonDisabled: { opacity: 0.5 },
    submitButtonText: { color: "white", fontSize: 17, fontWeight: "700" },
    
    skipText: { color: '#1E6594', fontSize: 16, fontWeight: '600' }
});