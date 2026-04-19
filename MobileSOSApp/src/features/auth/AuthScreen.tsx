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


import { signUp, signIn, confirmSignUp } from 'aws-amplify/auth';

type AuthMode = "signin" | "register" | "verify";

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
    
    // State for the 6-digit email verification code
    const [authCode, setAuthCode] = useState("");
    const [message, setMessage] = useState("");

    const isRegister = mode === "register";
    const isVerifying = mode === "verify";

    const hasLength = password.length >= 8 && password.length <= 16;
    const hasNumber = /\d/.test(password); 
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password); 

    const canSubmit = useMemo(() => {
        if (isVerifying) return authCode.length === 6; // OTP codes are 6 digits
        if (!email.trim() || !password.trim()) return false;
        
        if (isRegister) {
            const hasValidName = firstName.trim().length > 0 && lastName.trim().length > 0;
            const passwordsMatch = confirmPassword.trim() === password.trim();
            const isPasswordValid = hasLength && hasNumber && hasSymbol;
            return hasValidName && passwordsMatch && isPasswordValid;
        }
        return true;
    }, [confirmPassword, email, firstName, lastName, isRegister, isVerifying, password, authCode, hasLength, hasNumber, hasSymbol]);

    async function onSubmit() {
        if (!canSubmit) return;
        setMessage("");

        try {
            if (isRegister) {
                // 1. SIGN UP WITH AWS COGNITO
                await signUp({
                    username: email,
                    password: password,
                    options: {
                        userAttributes: {
                            given_name: firstName,
                            family_name: lastName
                        }
                    }
                });
                
                // Switch to verification mode to type in the email code
                setMode("verify");
                setMessage("Success! Check your email for a verification code.");

            } else if (isVerifying) {
                // VERIFY THE OTP CODE
                await confirmSignUp({
                    username: email,
                    confirmationCode: authCode
                });
                try {
                    await signIn({ username: email, password });
                    setMessage("Email verified and sign in successful!");
                    setTimeout(() => {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: "MainDashboard" }],
                        });
                    }, 600);
                } catch (signInAfterVerifyError: any) {
                    setMessage(
                        signInAfterVerifyError?.message ||
                        "Email verified. Please sign in to continue."
                    );
                    setMode("signin");
                }

            } else {
                // SIGN IN WITH AWS COGNITO
                await signIn({ username: email, password });
                
                setMessage("Sign in successful!");
                
                // AWS automatically saves the token securely.
                setTimeout(() => {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: "MainDashboard" }],
                    }); 
                }, 1000);
            }
        } catch (error: any) {
            setMessage(error.message || "Authentication failed. Please try again.");
        }
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Mobile SOS</Text>
                        <Text style={styles.subtitle}>
                            {isVerifying ? "Verify your email to continue." : 
                             isRegister ? "Create an account to stay safe." : 
                             "Sign in to access your dashboard."}
                        </Text>
                    </View>

                    {/* Hide the tabs if we are currently verifying the email */}
                    {!isVerifying && (
                        <View style={styles.switchRow}>
                            <Pressable style={[styles.switchButton, !isRegister && styles.switchButtonActive]} onPress={() => setMode("signin")}>
                                <Text style={!isRegister ? styles.switchTextActive : styles.switchText}>Sign In</Text>
                            </Pressable>
                            <Pressable style={[styles.switchButton, isRegister && styles.switchButtonActive]} onPress={() => setMode("register")}>
                                <Text style={isRegister ? styles.switchTextActive : styles.switchText}>Register</Text>
                            </Pressable>
                        </View>
                    )}


                    {isVerifying ? (
                        // VERIFICATION UI
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Verification Code</Text>
                            <TextInput
                                style={styles.input}
                                value={authCode}
                                onChangeText={setAuthCode}
                                placeholder="123456"
                                keyboardType="number-pad"
                                maxLength={6}
                            />
                        </View>
                    ) : (
                        // STANDARD LOGIN/REGISTER UI
                        <>
                            {isRegister && (
                                <>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>First Name</Text>
                                        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="John" />
                                    </View>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Last Name</Text>
                                        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Doe" />
                                    </View>
                                </>
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="name@example.com" autoCapitalize="none" keyboardType="email-address" />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Password</Text>
                                <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
                            </View>

                            {isRegister && (
                                <>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Confirm Password</Text>
                                        <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••" secureTextEntry />
                                    </View>
                                    <View style={styles.passwordRequirements}>
                                        <Text style={[styles.reqText, hasLength ? styles.reqMet : styles.reqUnmet]}>{hasLength ? '✓' : '○'} 8-16 characters</Text>
                                        <Text style={[styles.reqText, hasNumber ? styles.reqMet : styles.reqUnmet]}>{hasNumber ? '✓' : '○'} At least 1 number</Text>
                                        <Text style={[styles.reqText, hasSymbol ? styles.reqMet : styles.reqUnmet]}>{hasSymbol ? '✓' : '○'} At least 1 special symbol</Text>
                                    </View>
                                </>
                            )}
                        </>
                    )}

                    {message ? <Text style={styles.messageText}>{message}</Text> : null}

                    <Pressable style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} onPress={onSubmit} disabled={!canSubmit}>
                        <Text style={styles.submitButtonText}>
                            {isVerifying ? "Verify Code" : isRegister ? "Create Account" : "Sign In"}
                        </Text>
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
