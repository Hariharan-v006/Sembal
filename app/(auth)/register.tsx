import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View, KeyboardAvoidingView, Platform } from "react-native";
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
  phone: z.string().min(8, "Invalid phone number"),
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
  
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
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
            phone: values.phone,
            blood_group: values.blood_group,
          },
        },
      });
      
      if (error || !data.user) throw error || new Error("Signup failed");
      
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          city: values.city,
          state: values.state,
          gender: values.gender,
          date_of_birth: values.date_of_birth,
        })
        .eq("id", data.user.id);
        
      if (profileError) console.error("Profile update error:", profileError);
      
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Signup failed", err.message || "Try again");
    } finally {
      setSubmitting(false);
    }
  };

  const InputField = ({ label, name, icon, placeholder, keyboardType = "default", secureTextEntry = false, showToggle = false }: any) => (
    <View className="mb-4">
      <Text className="text-zinc-500 text-[10px] font-bold uppercase mb-1.5 ml-1">{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <View className={`flex-row items-center h-12 rounded-xl border ${errors[name] ? 'border-red-500' : 'border-zinc-100'} bg-zinc-50 px-4 shadow-sm`}>
            <Ionicons name={icon} size={18} color="#666" />
            <TextInput
              className="flex-1 ml-3 text-zinc-800 font-medium text-sm"
              placeholder={placeholder}
              placeholderTextColor="#AAA"
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
              keyboardType={keyboardType}
              secureTextEntry={secureTextEntry && !showPassword}
            />
            {showToggle && (
              <Pressable onPress={() => setShowPassword(!showPassword)} className="p-1">
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#666" />
              </Pressable>
            )}
          </View>
        )}
      />
      {errors[name] && <Text className="text-red-500 text-[9px] mt-1 ml-1">{(errors[name] as any).message}</Text>}
    </View>
  );

  return (
    <View className="flex-1">
      <StatusBar style="light" />
      <LinearGradient
        colors={["#7B1E1E", "#C0392B", "#E74C3C"]}
        className="absolute h-full w-full"
      />
      
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1, paddingVertical: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="px-6">
              {/* Header */}
              <View className="flex-row items-center mb-6">
                <Link href="/(auth)/login" asChild>
                  <Pressable className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-4">
                    <Ionicons name="arrow-back" size={20} color="white" />
                  </Pressable>
                </Link>
                <View>
                  <Text className="text-3xl font-extrabold text-white">Join Sembal</Text>
                  <Text className="text-white/80 text-sm font-medium">Create your blood donor account</Text>
                </View>
              </View>

              {/* Form Card */}
              <View className="bg-white rounded-3xl p-6 shadow-2xl mb-10">
                <InputField label="Full Name" name="full_name" icon="person-outline" placeholder="Enter your full name" />
                <InputField label="Email Address" name="email" icon="mail-outline" placeholder="your@email.com" keyboardType="email-address" />
                <InputField label="Phone Number" name="phone" icon="call-outline" placeholder="+91 00000 00000" keyboardType="phone-pad" />
                <InputField label="Password" name="password" icon="lock-closed-outline" placeholder="Min. 8 characters" secureTextEntry={true} showToggle={true} />
                <InputField label="Date of Birth" name="date_of_birth" icon="calendar-outline" placeholder="YYYY-MM-DD" />

                {/* Gender selection */}
                <View className="mb-4">
                  <Text className="text-zinc-500 text-[10px] font-bold uppercase mb-2 ml-1">Gender</Text>
                  <View className="flex-row gap-2">
                    {(["male", "female", "other"] as const).map((g) => (
                      <Pressable
                        key={g}
                        className={`flex-1 rounded-xl border py-2.5 items-center ${selectedGender === g ? "border-[#C0392B] bg-red-50" : "border-zinc-100 bg-zinc-50"}`}
                        onPress={() => setValue("gender", g, { shouldValidate: true })}
                      >
                        <Text className={`capitalize text-xs font-bold ${selectedGender === g ? "text-[#C0392B]" : "text-zinc-500"}`}>{g}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Blood Group selection */}
                <View className="mb-6">
                  <Text className="text-zinc-500 text-[10px] font-bold uppercase mb-2 ml-1">Blood Group</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {BLOOD_GROUPS.map((group) => (
                      <Pressable
                        key={group}
                        className={`w-[22%] rounded-xl border py-2.5 items-center ${selectedBlood === group ? "border-[#C0392B] bg-red-50" : "border-zinc-100 bg-zinc-50"}`}
                        onPress={() => {
                          setSelectedBlood(group);
                          setValue("blood_group", group, { shouldValidate: true });
                        }}
                      >
                        <Text className={`font-bold text-xs ${selectedBlood === group ? "text-[#C0392B]" : "text-zinc-500"}`}>{group}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View className="flex-row gap-4 mb-8">
                  <View className="flex-1">
                    <InputField label="City" name="city" icon="location-outline" placeholder="City" />
                  </View>
                  <View className="flex-1">
                    <InputField label="State" name="state" icon="map-outline" placeholder="State" />
                  </View>
                </View>

                {/* Submit Button */}
                <Pressable 
                  className={`h-14 rounded-2xl items-center justify-center shadow-lg ${submitting ? 'bg-zinc-300' : ''}`}
                  onPress={handleSubmit(onSubmit)}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={["#D35400", "#C0392B"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="absolute inset-0 rounded-2xl"
                  />
                  {submitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-lg">Create Account</Text>
                  )}
                </Pressable>
              </View>

              {/* Footer */}
              <View className="flex-row justify-center pb-10">
                <Text className="text-white/80 font-medium">Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <Pressable>
                    <Text className="text-white font-bold underline">Sign in</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
