import { useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BLOOD_GROUPS } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

const schema = z.object({
  full_name: z.string().min(2, "Name is too short"),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^[0-9]{10}$/, "Enter a valid 10-digit number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  blood_group: z.enum(BLOOD_GROUPS),
  date_of_birth: z.string().min(8, "Invalid date"),
  gender: z.enum(["male", "female", "other"]),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const router = useRouter();
  const [selectedBlood, setSelectedBlood] = useState<(typeof BLOOD_GROUPS)[number]>("O+");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { blood_group: "O+", gender: "male", date_of_birth: "" },
  });

  const selectedGender = watch("gender");

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.full_name,
            phone: `+91${values.phone}`,
            blood_group: values.blood_group,
            city: values.city,
            state: values.state,
            gender: values.gender,
            date_of_birth: values.date_of_birth,
          },
        },
      });

      if (error || !data.user) throw error || new Error("Signup failed");

      if (!data.session) {
        Alert.alert(
          "Check your email",
          "Account created! Please confirm your email address to log in.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
        );
        return;
      }

      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Signup failed", err.message || "Try again");
    } finally {
      setSubmitting(false);
    }
  };

  const InputField = ({
    label,
    name,
    icon,
    placeholder,
    keyboardType = "default",
    secureTextEntry = false,
    showToggle = false,
  }: {
    label: string;
    name: keyof FormValues;
    icon: keyof typeof Ionicons.glyphMap;
    placeholder: string;
    keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
    secureTextEntry?: boolean;
    showToggle?: boolean;
  }) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <View style={[styles.inputRow, errors[name] && styles.inputError]}>
            <Ionicons name={icon} size={18} color="#888" />
            {name === "phone" && (
              <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: "600", color: "#1A1A1A" }}>+91</Text>
            )}
            <TextInput
              style={[styles.textInput, name === "phone" && { marginLeft: 4 }]}
              placeholder={placeholder}
              placeholderTextColor="#AAAAAA"
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
              keyboardType={keyboardType}
              maxLength={name === "phone" ? 10 : undefined}
              secureTextEntry={secureTextEntry && !showPassword}
            />
            {showToggle && (
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#888"
                />
              </Pressable>
            )}
          </View>
        )}
      />
      {errors[name] && (
        <Text style={styles.fieldError}>{(errors[name] as any).message}</Text>
      )}
    </View>
  );

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

      <SafeAreaView style={styles.flex}>
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
              <Link href="/(auth)/login" asChild>
                <Pressable style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={20} color="white" />
                </Pressable>
              </Link>
              <View>
                <Text style={styles.brand}>Join Sembal</Text>
                <Text style={styles.tagline}>Create your blood donor account</Text>
              </View>
            </View>

            {/* Form Card */}
            <View style={styles.card}>
              <InputField label="Full Name" name="full_name" icon="person-outline" placeholder="Enter your full name" />
              <InputField label="Email Address" name="email" icon="mail-outline" placeholder="your@email.com" keyboardType="email-address" />
              <InputField label="Phone Number" name="phone" icon="call-outline" placeholder="+91 00000 00000" keyboardType="phone-pad" />
              <InputField label="Password" name="password" icon="lock-closed-outline" placeholder="Min. 8 characters" secureTextEntry showToggle />
              <InputField label="Date of Birth" name="date_of_birth" icon="calendar-outline" placeholder="YYYY-MM-DD" />

              {/* Gender */}
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>GENDER</Text>
                <View style={styles.chipRow}>
                  {(["male", "female", "other"] as const).map((g) => (
                    <Pressable
                      key={g}
                      style={[
                        styles.chip,
                        selectedGender === g && styles.chipActive,
                      ]}
                      onPress={() => setValue("gender", g, { shouldValidate: true })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedGender === g && styles.chipTextActive,
                        ]}
                      >
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Blood Group */}
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>BLOOD GROUP</Text>
                <View style={styles.bloodGrid}>
                  {BLOOD_GROUPS.map((group) => (
                    <Pressable
                      key={group}
                      style={[
                        styles.bloodChip,
                        selectedBlood === group && styles.bloodChipActive,
                      ]}
                      onPress={() => {
                        setSelectedBlood(group);
                        setValue("blood_group", group, { shouldValidate: true });
                      }}
                    >
                      <Text
                        style={[
                          styles.bloodChipText,
                          selectedBlood === group && styles.bloodChipTextActive,
                        ]}
                      >
                        {group}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* City & State */}
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <InputField label="City" name="city" icon="location-outline" placeholder="City" />
                </View>
                <View style={styles.halfField}>
                  <InputField label="State" name="state" icon="map-outline" placeholder="State" />
                </View>
              </View>

              {/* Submit */}
              <Pressable
                onPress={handleSubmit(onSubmit)}
                disabled={submitting}
                style={styles.btnOuter}
              >
                <LinearGradient
                  colors={submitting ? ["#ccc", "#bbb"] : ["#E74C3C", "#C0392B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.btnText}>Create Account</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={styles.footerLink}>Sign in</Text>
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
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  // Decorative
  circle1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255,255,255,0.04)",
    top: -60,
    right: -70,
  },
  circle2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: 80,
    left: -50,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  tagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    marginTop: 2,
  },
  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  // Fields
  fieldWrap: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#888888",
    letterSpacing: 0.8,
    marginBottom: 7,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 14,
    gap: 10,
  },
  inputError: {
    borderColor: "#E74C3C",
    backgroundColor: "#FFF5F5",
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  eyeBtn: { padding: 4 },
  fieldError: {
    color: "#E74C3C",
    fontSize: 10,
    marginTop: 3,
    marginLeft: 4,
  },
  // Chips
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
    backgroundColor: "#F9F9F9",
    paddingVertical: 10,
    alignItems: "center",
  },
  chipActive: {
    borderColor: "#C0392B",
    backgroundColor: "#FFF0EE",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888888",
  },
  chipTextActive: {
    color: "#C0392B",
  },
  // Blood grid
  bloodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bloodChip: {
    width: "22%",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
    backgroundColor: "#F9F9F9",
    paddingVertical: 10,
    alignItems: "center",
  },
  bloodChipActive: {
    borderColor: "#C0392B",
    backgroundColor: "#FFF0EE",
  },
  bloodChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888888",
  },
  bloodChipTextActive: {
    color: "#C0392B",
  },
  // Row layout
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  // Button
  btnOuter: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
  },
  btnGradient: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  btnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 12,
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
