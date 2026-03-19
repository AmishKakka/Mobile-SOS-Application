import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AccountAlreadyExistsError, registerUser } from "../services/auth";

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasValidEmail = email.includes("@") && email.includes(".");
  const digitCount = phone.replace(/\D/g, "").length;

  const canSubmit = useMemo(() => {
    return (
      fullName.trim().length > 1 &&
      hasValidEmail &&
      digitCount >= 10 &&
      password.trim().length >= 6 &&
      confirmPassword.trim() === password.trim() &&
      agreed
    );
  }, [agreed, confirmPassword, digitCount, fullName, hasValidEmail, password]);

  async function onCreateAccount() {
    if (isSubmitting) {
      return;
    }

    if (!canSubmit) {
      if (!hasValidEmail) {
        setMessage("Enter a valid email address.");
        return;
      }
      if (digitCount < 10) {
        setMessage("Enter a valid phone number.");
        return;
      }
      if (confirmPassword.trim() !== password.trim() && confirmPassword.trim().length > 0) {
        setMessage("Passwords do not match.");
        return;
      }
      setMessage("Please complete all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage("");

      await registerUser({
        fullName,
        email,
        phone,
        password,
      });

      setMessage("Registration successful. Redirecting to Sign In...");
      router.replace("/sign-in");
    } catch (error) {
      if (error instanceof AccountAlreadyExistsError) {
        setMessage("Account already exists. Please sign in instead.");
        return;
      }

      setMessage("Could not register right now. Please try again.");
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
              <Feather name="shield" size={36} color="#FFFFFF" />
            </View>

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Set up SafeGuard to quickly share your location during emergencies.
            </Text>

            <View style={styles.noticeCard}>
              <Feather name="alert-circle" size={22} color="#BA5D00" />
              <View style={styles.noticeTextWrap}>
                <Text style={styles.noticeTitle}>Emergency Profile Required</Text>
                <Text style={styles.noticeBody}>
                  Your details help responders contact you and your trusted emergency contacts.
                </Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <InputField
                icon="user"
                label="Full Name"
                placeholder="Alex Morgan"
                value={fullName}
                onChangeText={setFullName}
              />
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
                icon="phone"
                label="Phone Number"
                placeholder="+1 555 123 4567"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <InputField
                icon="lock"
                label="Password"
                placeholder="At least 6 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <InputField
                icon="check-circle"
                label="Confirm Password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              <Pressable
                style={styles.consentRow}
                onPress={() => setAgreed((current) => !current)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed ? <Feather name="check" size={13} color="#FFFFFF" /> : null}
                </View>
                <Text style={styles.consentText}>
                  I agree to SafeGuard terms and emergency data-sharing policy.
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.ctaButton, (!canSubmit || isSubmitting) && styles.ctaButtonDisabled]}
              onPress={onCreateAccount}
            >
              <Text style={styles.ctaText}>{isSubmitting ? "Creating..." : "Create Account"}</Text>
            </Pressable>

            {message ? <Text style={styles.message}>{message}</Text> : null}

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already registered? </Text>
              <Pressable onPress={() => router.push("/sign-in")}>
                <Text style={styles.signInText}>Sign In</Text>
              </Pressable>
            </View>
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
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
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
  noticeCard: {
    borderWidth: 1.5,
    borderColor: "#EFCD75",
    backgroundColor: "#F8F3E3",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  noticeTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  noticeTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
    color: "#A14E00",
    marginBottom: 2,
  },
  noticeBody: {
    fontSize: 13,
    lineHeight: 20,
    color: "#B05E0F",
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
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#C6CFDD",
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    borderColor: "#F40009",
    backgroundColor: "#F40009",
  },
  consentText: {
    flex: 1,
    marginLeft: 9,
    color: "#607089",
    fontSize: 13,
    lineHeight: 19,
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
  footerText: {
    color: "#77849B",
    fontSize: 14,
  },
  footerRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signInText: {
    color: "#0E1E3A",
    textDecorationLine: "underline",
    fontWeight: "700",
  },
});
