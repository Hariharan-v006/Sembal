import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword(values);
      if (authError) throw authError;
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#4A0000", "#8B1A1A", "#C0392B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoWrap}>
                <Ionicons name="water" size={44} color="white" />
              </View>
              <Text style={styles.brand}>SEMBAL</Text>
              <Text style={styles.tagline}>Blood Response Network</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome Back</Text>
              <Text style={styles.cardSubtitle}>Sign in to continue helping lives</Text>

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#C0392B" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Email */}
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { value, onChange } }) => (
                    <View style={[styles.inputRow, errors.email && styles.inputError]}>
                      <Ionicons name="mail-outline" size={20} color="#888" />
                      <TextInput
                        style={styles.textInput}
                        placeholder="your@email.com"
                        placeholderTextColor="#AAAAAA"
                        value={value}
                        onChangeText={onChange}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  )}
                />
                {errors.email && (
                  <Text style={styles.fieldError}>{errors.email.message}</Text>
                )}
              </View>

              {/* Password */}
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>PASSWORD</Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { value, onChange } }) => (
                    <View style={[styles.inputRow, errors.password && styles.inputError]}>
                      <Ionicons name="lock-closed-outline" size={20} color="#888" />
                      <TextInput
                        style={styles.textInput}
                        placeholder="••••••••"
                        placeholderTextColor="#AAAAAA"
                        value={value}
                        onChangeText={onChange}
                        secureTextEntry={!showPassword}
                      />
                      <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color="#888"
                        />
                      </Pressable>
                    </View>
                  )}
                />
                {errors.password && (
                  <Text style={styles.fieldError}>{errors.password.message}</Text>
                )}
              </View>

              {/* Forgot password */}
              <Pressable style={styles.forgotWrap}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>

              {/* Sign In Button */}
              <Pressable
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
                style={styles.btnOuter}
              >
                <LinearGradient
                  colors={loading ? ["#ccc", "#bbb"] : ["#E74C3C", "#C0392B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View style={styles.btnContent}>
                      <Text style={styles.btnText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={18} color="white" />
                    </View>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <Pressable>
                  <Text style={styles.footerLink}>Register</Text>
                </Pressable>
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#4A0000",
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  // Decorative
  circle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.04)",
    top: -80,
    right: -80,
  },
  circle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: 60,
    left: -60,
  },
  // Header
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  brand: {
    fontSize: 48,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    marginTop: 4,
  },
  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#888888",
    marginBottom: 24,
  },
  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: "#C0392B",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  // Fields
  fieldWrap: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#888888",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 16,
    gap: 12,
  },
  inputError: {
    borderColor: "#E74C3C",
    backgroundColor: "#FFF5F5",
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  eyeBtn: {
    padding: 4,
  },
  fieldError: {
    color: "#E74C3C",
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  // Forgot
  forgotWrap: {
    alignSelf: "flex-end",
    marginBottom: 24,
    marginTop: 4,
  },
  forgotText: {
    color: "#C0392B",
    fontWeight: "700",
    fontSize: 13,
  },
  // Button
  btnOuter: {
    borderRadius: 16,
    overflow: "hidden",
  },
  btnGradient: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 17,
    letterSpacing: 0.3,
  },
  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },
  footerText: {
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    fontSize: 14,
  },
  footerLink: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
