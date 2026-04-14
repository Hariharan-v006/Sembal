import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from "react-native";
import { Link, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

const { height } = Dimensions.get("window");

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
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({ 
    resolver: zodResolver(schema) 
  });

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
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            showsVerticalScrollIndicator={false}
          >
            <View className="px-8 pb-10">
              {/* Header Section */}
              <View className="items-center mb-10">
                <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-4 border border-white/30 shadow-xl">
                  <Ionicons name="water" size={50} color="white" />
                </View>
                <Text className="text-5xl font-extrabold text-white tracking-tighter">sembal</Text>
                <Text className="text-white/80 text-lg font-medium mt-1">Blood Response Network</Text>
              </View>

              {/* Form Section */}
              <View className="bg-white/95 rounded-3xl p-8 shadow-2xl">
                <Text className="text-2xl font-bold text-zinc-800 mb-6">Welcome Back</Text>

                {error && (
                  <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex-row items-center">
                    <Ionicons name="alert-circle" size={18} color="#C0392B" />
                    <Text className="ml-2 text-red-700 text-xs font-medium">{error}</Text>
                  </View>
                )}

                {/* Email Input */}
                <View className="mb-4">
                  <Text className="text-zinc-500 text-xs font-semibold uppercase mb-2 ml-1">Email Address</Text>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { value, onChange } }) => (
                      <View className={`flex-row items-center h-14 rounded-2xl border ${errors.email ? 'border-red-500' : 'border-zinc-100'} bg-zinc-50 px-4 shadow-sm`}>
                        <Ionicons name="mail-outline" size={20} color="#666" />
                        <TextInput
                          className="flex-1 ml-3 text-zinc-800 font-medium"
                          placeholder="your@email.com"
                          placeholderTextColor="#AAA"
                          value={value}
                          onChangeText={onChange}
                          autoCapitalize="none"
                          keyboardType="email-address"
                        />
                      </View>
                    )}
                  />
                  {errors.email && <Text className="text-red-500 text-[10px] mt-1 ml-1">{errors.email.message}</Text>}
                </View>

                {/* Password Input */}
                <View className="mb-2">
                  <Text className="text-zinc-500 text-xs font-semibold uppercase mb-2 ml-1">Password</Text>
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { value, onChange } }) => (
                      <View className={`flex-row items-center h-14 rounded-2xl border ${errors.password ? 'border-red-500' : 'border-zinc-100'} bg-zinc-50 px-4 shadow-sm`}>
                        <Ionicons name="lock-closed-outline" size={20} color="#666" />
                        <TextInput
                          className="flex-1 ml-3 text-zinc-800 font-medium"
                          placeholder="••••••••"
                          placeholderTextColor="#AAA"
                          value={value}
                          onChangeText={onChange}
                          secureTextEntry={!showPassword}
                        />
                        <Pressable onPress={() => setShowPassword(!showPassword)} className="p-2">
                          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
                        </Pressable>
                      </View>
                    )}
                  />
                  {errors.password && <Text className="text-red-500 text-[10px] mt-1 ml-1">{errors.password.message}</Text>}
                </View>

                <Link href="/(auth)/login" asChild>
                  <Pressable className="mb-6 self-end">
                    <Text className="text-xs font-bold text-[#C0392B]">Forgot Password?</Text>
                  </Pressable>
                </Link>

                {/* Sign In Button */}
                <Pressable 
                  className={`h-14 rounded-2xl items-center justify-center shadow-lg ${loading ? 'bg-zinc-300' : 'bg-[#C0392B]'}`}
                  onPress={handleSubmit(onSubmit)}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={["#D35400", "#C0392B"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="absolute inset-0 rounded-2xl"
                  />
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View className="flex-row items-center">
                      <Text className="text-white font-bold text-lg mr-2">Sign In</Text>
                      <Ionicons name="arrow-forward" size={18} color="white" />
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Footer Section */}
              <View className="mt-8 flex-row justify-center">
                <Text className="text-white/80 font-medium">Don't have an account? </Text>
                <Link href="/(auth)/register" asChild>
                  <Pressable>
                    <Text className="text-white font-bold underline">Register</Text>
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
