import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useLocation } from "@/hooks/useLocation";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";

export default function SosScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { coords } = useLocation();
  const [hospital, setHospital] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from("sos_alerts")
      .select("created_at")
      .eq("requester_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!data?.created_at) return;
        setCooldownUntil(new Date(new Date(data.created_at).getTime() + 60 * 60 * 1000));
      });
  }, [profile?.id]);

  const cooldownRemaining = useMemo(() => {
    if (!cooldownUntil) return 0;
    const diff = cooldownUntil.getTime() - nowTick;
    return Math.max(0, Math.floor(diff / 1000));
  }, [cooldownUntil, nowTick]);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const trigger = async () => {
    if (!profile?.id || !coords || !hospital) return;
    const { data, error } = await supabase
      .from("sos_alerts")
      .insert({
      requester_id: profile.id,
      blood_group: profile.blood_group,
      latitude: coords.latitude,
      longitude: coords.longitude,
      hospital_name: hospital,
      contact_number: profile.phone ?? "",
      radius_km: 30,
      })
      .select("created_at, donors_notified")
      .single();
    if (error) return Alert.alert("Error", error.message);
    try {
      await invokeEdgeFunction("notify-sos-nearby", {
        blood_group: profile.blood_group,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    } catch (edgeError) {
      Alert.alert("SOS created", `SOS saved, but notify function failed: ${(edgeError as Error).message}`);
    }
    setSentCount(data?.donors_notified ?? 0);
    setCooldownUntil(new Date(new Date(data.created_at).getTime() + 60 * 60 * 1000));
    Alert.alert("Alert sent", "Nearby donors will be notified.");
  };

  return (
    <View className="flex-1 items-center justify-center bg-[#1A0A0A] px-6">
      <Text className="text-3xl font-bold text-white">Emergency SOS</Text>
      {cooldownRemaining > 0 ? (
        <Text className="mt-2 text-xs text-orange-300">
          Next SOS available in {Math.floor(cooldownRemaining / 60)}:{String(cooldownRemaining % 60).padStart(2, "0")}
        </Text>
      ) : null}
      {typeof sentCount === "number" ? (
        <Text className="mt-2 text-sm text-green-300">{sentCount} donors notified</Text>
      ) : null}
      <TextInput
        className="mt-8 h-12 w-full rounded-xl border border-red-300 px-4 text-white"
        placeholder="Hospital Name"
        placeholderTextColor="#FFAAAA"
        value={hospital}
        onChangeText={setHospital}
      />
      <Pressable onPress={trigger} className={`mt-6 ${cooldownRemaining > 0 ? "opacity-50" : ""}`} disabled={cooldownRemaining > 0}>
        <LinearGradient colors={["#C0392B", "#E74C3C"]} className="h-44 w-44 items-center justify-center rounded-full">
          <Text className="text-5xl font-bold text-white">SOS</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
