import { useMemo, useState } from "react";
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

export default function AuthScreen() {
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

    setMessage(isRegister ? "Registration UI ready." : "Sign in UI ready.");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.brand}>Mobile SOS</Text>
            <Text style={styles.title}>{isRegister ? "Create Account" : "Sign In"}</Text>
            <Text style={styles.subtitle}>
              {isRegister
                ? "Register to access emergency helper features."
                : "Welcome back. Sign in to continue."}
            </Text>

            <View style={styles.switchRow}>
              <Pressable
                style={[styles.switchButton, !isRegister && styles.switchButtonActive]}
                onPress={() => {
                  setMode("signin");
                  setMessage("");
                }}
              >
                <Text style={[styles.switchText, !isRegister && styles.switchTextActive]}>Sign In</Text>
              </Pressable>
              <Pressable
                style={[styles.switchButton, isRegister && styles.switchButtonActive]}
                onPress={() => {
                  setMode("register");
                  setMessage("");
                }}
              >
                <Text style={[styles.switchText, isRegister && styles.switchTextActive]}>Register</Text>
              </Pressable>
            </View>

            {isRegister ? (
              <InputField
                label="Full Name"
                placeholder="Alex Morgan"
                value={fullName}
                onChangeText={setFullName}
              />
            ) : null}

            <InputField
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <InputField
              label="Password"
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {isRegister ? (
              <InputField
                label="Confirm Password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            ) : null}

            <Pressable
              onPress={onSubmit}
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            >
              <Text style={styles.submitText}>{isRegister ? "Create Account" : "Sign In"}</Text>
            </Pressable>

            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type InputFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
  secureTextEntry?: boolean;
};

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  autoCapitalize = "sentences",
  keyboardType = "default",
  secureTextEntry = false,
}: InputFieldProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7b8295"
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#0b1f3a",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  brand: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2f63d8",
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f1f39",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 14,
    color: "#5a6072",
    lineHeight: 20,
  },
  switchRow: {
    flexDirection: "row",
    backgroundColor: "#eef2fb",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  switchButton: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: "center",
  },
  switchButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#0d1a2b",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },
  switchText: {
    color: "#61708d",
    fontWeight: "600",
  },
  switchTextActive: {
    color: "#0f1f39",
    fontWeight: "700",
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
    color: "#32476b",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d8deec",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 14, default: 12 }),
    fontSize: 15,
    color: "#0f1f39",
    backgroundColor: "#fbfcff",
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: "#2f63d8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  message: {
    marginTop: 12,
    color: "#2f63d8",
    textAlign: "center",
    fontWeight: "600",
  },
});
