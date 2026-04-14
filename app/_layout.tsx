import "../global.css";
import { ActivityIndicator, Text, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { setSession, setUser, setProfile, session } = useAuthStore();
  const [loading, setLoading] = useState(true);
  useNotifications();

  useEffect(() => {
    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.session.user.id).single();
        setProfile(profile);
      }
      setLoading(false);
    };
    bootstrap();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", nextSession.user.id).single();
        setProfile(profile);
      } else {
        setProfile(null);
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, [setProfile, setSession, setUser]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!session && !inAuth) router.replace("/(auth)/login");
    if (session && inAuth) router.replace("/(tabs)");
  }, [loading, router, segments, session]);

  if (loading) {
    return (
      <View className="flex-1">
        <LinearGradient
          colors={["#7B1E1E", "#C0392B", "#E74C3C"]}
          className="absolute h-full w-full"
        />
        <View className="flex-1 items-center justify-center">
          <View className="w-24 h-24 bg-white/20 rounded-full items-center justify-center mb-6 border border-white/30">
            <ActivityIndicator size="large" color="white" />
          </View>
          <Text className="text-5xl font-extrabold text-white tracking-tighter">sembal</Text>
          <Text className="mt-2 text-white/80 text-lg font-medium">Blood Response Network</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
