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

    const handleNext = () => {
        // Optional: Save this initial data to your state management or backend here
        navigation.navigate('CompleteMedicalProfile');
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
                        <Text style={styles.submitButtonText}>Next: Medical Info</Text>
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