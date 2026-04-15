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
    Image
} from 'react-native';

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

    const handleNext = async () => {
        try {
            // RETRIEVE THE TOKEN FROM THE PHONE
            const session = await fetchAuthSession();
            // This extracts the secure AWS JWT token to send to your Express server
            const token = session.tokens?.idToken?.toString();

            if (!token) {
                console.error("No token found. User might not be logged in.");
                return;
            }

            // SEND THE SECURE UPDATE REQUEST
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // <--- Here is the ID Badge!
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
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Complete Profile</Text>
                        <Text style={styles.subtitle}>Help responders identify and locate you faster.</Text>
                    </View>

                    {/* Profile Photo */}
                    <View style={styles.photoContainer}>
                        <Image 
                            source={{ uri: 'https://via.placeholder.com/100' }} 
                            style={styles.profilePic} 
                        />
                        <TouchableOpacity onPress={handleChangePhoto}>
                            <Text style={styles.changePhotoText}>Upload Photo</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput 
                            style={styles.input} 
                            keyboardType="phone-pad" 
                            placeholder="(555) 123-4567"
                            value={formData.phone} 
                            onChangeText={(t) => setFormData({...formData, phone: t})} 
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Home Address</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="123 Main St, City, State"
                            value={formData.address} 
                            onChangeText={(t) => setFormData({...formData, address: t})} 
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, {flex: 1, marginRight: 10}]}>
                            <Text style={styles.label}>Height</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="e.g. 5'11"
                                value={formData.height} 
                                onChangeText={(t) => setFormData({...formData, height: t})} 
                            />
                        </View>
                        <View style={[styles.inputGroup, {flex: 1}]}>
                            <Text style={styles.label}>Weight (lbs)</Text>
                            <TextInput 
                                style={styles.input} 
                                keyboardType="numeric" 
                                placeholder="e.g. 160"
                                value={formData.weight} 
                                onChangeText={(t) => setFormData({...formData, weight: t})} 
                            />
                        </View>
                    </View>

                    <Pressable style={styles.submitButton} onPress={handleNext}>
                        <Text style={styles.submitButtonText}>Next: Emergency Contacts</Text>
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
    
    photoContainer: { alignItems: 'center', marginBottom: 24 },
    profilePic: { width: 100, height: 100, borderRadius: 50, marginBottom: 12, backgroundColor: '#eef2fb' },
    changePhotoText: { color: '#F40009', fontSize: 15, fontWeight: '600' },

    inputGroup: { marginBottom: 16 },
    label: { marginBottom: 6, color: "#32476b", fontWeight: "600" },
    input: { borderWidth: 1, borderColor: "#d8deec", borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: "white" },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    
    submitButton: { backgroundColor: "#F40009", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 24, marginBottom: 40 },
    submitButtonText: { color: "white", fontSize: 18, fontWeight: "bold" }
});