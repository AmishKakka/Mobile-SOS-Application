import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import {
  InvalidCredentialsError,
  UserDoesNotExistError,
  signInUser,
} from "../services/auth";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasValidEmail = email.includes("@") && email.includes(".");
  const canSubmit = useMemo(() => hasValidEmail && password.trim().length > 0, [hasValidEmail, password]);

  async function onSignIn() {
    if (isSubmitting) {
      return;
    }

    if (!canSubmit) {
      if (!hasValidEmail) {
        setMessage("Enter a valid email.");
        return;
      }

      setMessage("Enter your password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage("");

      await signInUser({ email, password });
      setMessage("Sign in successful. Redirecting...");
      router.replace("/dashboard" as never);
    } catch (error) {
      if (error instanceof UserDoesNotExistError) {
        setMessage("User dont exists.");
        return;
      }

      if (error instanceof InvalidCredentialsError) {
        setMessage("Invalid details.");
        return;
      }

      setMessage("Could not sign in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.page}>
            <View style={styles.iconWrap}>
              <Feather name="log-in" size={36} color="#FFFFFF" />
            </View>

            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>Enter your credentials to continue to your SOS dashboard.</Text>

            <View style={styles.formCard}>
              <InputField
                icon="mail"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <InputField
                icon="lock"
                label="Password"
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <Pressable
              style={[styles.ctaButton, (!canSubmit || isSubmitting) && styles.ctaButtonDisabled]}
              onPress={onSignIn}
            >
              <Text style={styles.ctaText}>{isSubmitting ? "Signing In..." : "Sign In"}</Text>
            </Pressable>

            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type InputFieldProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
  secureTextEntry?: boolean;
};

function InputField({
  icon,
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
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <Feather name={icon} size={18} color="#F40009" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#97A1B5"
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F1F3F6",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    alignItems: "center",
  },
  page: {
    width: "100%",
    maxWidth: 460,
  },
  iconWrap: {
    width: 104,
    height: 104,
    borderRadius: 24,
    backgroundColor: "#F40009",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    marginTop: 4,
  },
  title: {
    textAlign: "center",
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "800",
    color: "#0E1E3A",
    marginBottom: 6,
  },
  subtitle: {
    textAlign: "center",
    color: "#5C6A83",
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderWidth: 1.2,
    borderColor: "#E6EBF3",
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    color: "#293A59",
    fontWeight: "700",
    marginBottom: 6,
  },
  inputRow: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6DDEA",
    backgroundColor: "#FBFCFE",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 9,
  },
  input: {
    flex: 1,
    height: Platform.select({ ios: 36, default: 40 }),
    color: "#16243D",
    fontSize: 15,
    paddingVertical: 0,
  },
  ctaButton: {
    marginTop: 18,
    backgroundColor: "#F40009",
    borderRadius: 18,
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaButtonDisabled: {
    opacity: 0.52,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
  },
  message: {
    marginTop: 10,
    textAlign: "center",
    color: "#1D3152",
    fontSize: 13,
    fontWeight: "600",
  },
});
