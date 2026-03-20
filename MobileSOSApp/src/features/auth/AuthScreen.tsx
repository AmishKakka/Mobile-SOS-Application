import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");

    const isRegister = mode === "register";

    const canSubmit = useMemo(() => {
        if (!email.trim() || !password.trim()) return false;
        if (isRegister) {
            return fullName.trim().length > 1 && confirmPassword.trim() === password.trim();
        }
        return true;
    }, [confirmPassword, email, fullName, isRegister, password]);

    function onSubmit() {
        if (!canSubmit) {
            if (isRegister && confirmPassword.trim() !== password.trim()) {
                setMessage("Passwords do not match.");
                return;
            }
            setMessage("Please fill in all required fields.");
            return;
        }

        setMessage(isRegister ? "Registration successful!" : "Sign in successful!");

        setTimeout(() => {
            navigation.replace("MainDashboard");
        }, 1000);
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

                    {isRegister && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="John Doe"
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
});