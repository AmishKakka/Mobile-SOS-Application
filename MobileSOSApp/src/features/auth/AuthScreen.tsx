import type { ParamListBase } from '@react-navigation/native';
import { API_BASE_URL } from '../../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
// import { Alert } from 'react-native';
import React, { useMemo, useState } from "react";
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
} from "react-native";

type AuthMode = "signin" | "register";

type AuthScreenProps = {
    navigation: NativeStackNavigationProp<ParamListBase>;
};

export default function AuthScreen({ navigation }: AuthScreenProps) {
    const [mode, setMode] = useState<AuthMode>("signin");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");

    const isRegister = mode === "register";

    // Move these UP here so the canSubmit function can see them!
    const hasLength = password.length >= 8 && password.length <= 16;
    const hasNumber = /\d/.test(password); 
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password); 

    const canSubmit = useMemo(() => {
        if (!email.trim() || !password.trim()) return false;
        
        if (isRegister) {
            // Check if both first and last names have content
            const hasValidName = firstName.trim().length > 0 && lastName.trim().length > 0;
            const passwordsMatch = confirmPassword.trim() === password.trim();
            
            // Group the new rules together
            const isPasswordValid = hasLength && hasNumber && hasSymbol;
            
            // Enforce ALL rules before allowing the button to work
            return hasValidName && passwordsMatch && isPasswordValid;
        }
        
        return true;
    }, [confirmPassword, email, firstName, lastName, isRegister, password, hasLength, hasNumber, hasSymbol]);
    async function onSubmit() {

        if (!canSubmit){
            // console.log("Form validation failed, stopping.");
            return;
        } 

        try {
            if (isRegister) {
                // Send Registration Request
                const response = await fetch(`${API_BASE_URL}/users/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ firstName, lastName, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // SAVE THE TOKEN TO THE PHONE
                    await AsyncStorage.setItem('userToken', data.token);
                    
                    setMessage("Registration successful!");
                    
                    setTimeout(() => {
                        navigation.navigate("CompleteProfile");
                    }, 1000);
                } else {
                    setMessage(data.message || "Registration failed.");
                }
            } else {
                // Send Login Request
                const response = await fetch(`${API_BASE_URL}/users/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }) 
                });

                const data = await response.json();

                if (response.ok) {
                    // SAVE THE TOKEN TO THE PHONE
                    await AsyncStorage.setItem('userToken', data.token);
                    
                    setMessage("Sign in successful!");
                    
                    // Route returning users directly to the main app
                    setTimeout(() => {
                        navigation.replace("MainDashboard"); 
                    }, 1000);
                } else {
                    setMessage(data.message || "Invalid email or password.");
                }
            }
        } catch (error) {
            // console.error("The exact network error is:", error);
            setMessage("Network error. Please make sure your backend is running.");
        }
    }


    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Mobile SOS</Text>
                        <Text style={styles.subtitle}>
                            {isRegister ? "Create an account to stay safe." : "Sign in to access your dashboard."}
                        </Text>
                    </View>

                    <View style={styles.switchRow}>
                        <Pressable
                            style={[styles.switchButton, !isRegister && styles.switchButtonActive]}
                            onPress={() => setMode("signin")}
                        >
                            <Text style={!isRegister ? styles.switchTextActive : styles.switchText}>Sign In</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.switchButton, isRegister && styles.switchButtonActive]}
                            onPress={() => setMode("register")}
                        >
                            <Text style={isRegister ? styles.switchTextActive : styles.switchText}>Register</Text>
                        </Pressable>
                    </View>

                    {/* {isRegister && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="John Doe"
                            />
                        </View>
                        
                    )} */}

                    {isRegister && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>First Name</Text>
                            <TextInput
                                style={styles.input}
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="John"
                            />
                        </View>
                    )}

                    {isRegister && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Last Name</Text>
                            <TextInput
                                style={styles.input}
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="Doe"
                            />
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="name@example.com"
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="••••••••"
                            secureTextEntry
                        />
                    </View>

                    {isRegister && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <TextInput
                                style={styles.input}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="••••••••"
                                secureTextEntry
                            />
                        </View>
                    )}

                    {isRegister && (
                        <View style={styles.passwordRequirements}>
                            <Text style={[styles.reqText, hasLength ? styles.reqMet : styles.reqUnmet]}>
                                {hasLength ? '✓' : '○'} 8-16 characters
                            </Text>
                            <Text style={[styles.reqText, hasNumber ? styles.reqMet : styles.reqUnmet]}>
                                {hasNumber ? '✓' : '○'} At least 1 number
                            </Text>
                            <Text style={[styles.reqText, hasSymbol ? styles.reqMet : styles.reqUnmet]}>
                                {hasSymbol ? '✓' : '○'} At least 1 special symbol
                            </Text>
                        </View>
                    )}

                    {message ? <Text style={styles.messageText}>{message}</Text> : null}

                    <Pressable
                        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                        onPress={onSubmit}
                        disabled={!canSubmit}
                    >
                        <Text style={styles.submitButtonText}>{isRegister ? "Create Account" : "Sign In"}</Text>
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
    switchRow: { flexDirection: "row", backgroundColor: "#eef2fb", borderRadius: 12, padding: 4, marginBottom: 24 },
    switchButton: { flex: 1, borderRadius: 9, paddingVertical: 10, alignItems: "center" },
    switchButtonActive: { backgroundColor: "#ffffff", shadowColor: "#0d1a2b", shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
    switchText: { color: "#61708d", fontWeight: "600" },
    switchTextActive: { color: "#0f1f39", fontWeight: "700" },
    inputGroup: { marginBottom: 16 },
    label: { marginBottom: 6, color: "#32476b", fontWeight: "600" },
    input: { borderWidth: 1, borderColor: "#d8deec", borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: "white" },
    submitButton: { backgroundColor: "#F40009", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 24 },
    submitButtonDisabled: { backgroundColor: "#fca5a5" },
    submitButtonText: { color: "white", fontSize: 18, fontWeight: "bold" },
    messageText: { color: "#F40009", textAlign: "center", marginTop: 10, fontWeight: "600" },
    passwordRequirements: {
        marginTop: -10,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    reqText: {
        fontSize: 12,
        marginTop: 4,
    },
    reqMet: {
        color: '#10B981', // Green when passed
    },
    reqUnmet: {
        color: '#6B7280', // Gray when failing
    },
});