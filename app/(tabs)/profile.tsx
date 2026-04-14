import { Alert, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function ProfileScreen() {
  const { profile, updateProfile, logout } = useAuthStore();
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [helpedCount, setHelpedCount] = useState(0);
  const [donationCount, setDonationCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    supabase.from("blood_requests").select("id", { count: "exact", head: true }).eq("requester_id", profile.id).then(({ count }) => setRequestCount(count ?? 0));
    supabase.from("donation_records").select("id", { count: "exact", head: true }).eq("donor_id", profile.id).then(({ count }) => setDonationCount(count ?? 0));
    supabase.from("donor_responses").select("id", { count: "exact", head: true }).eq("donor_id", profile.id).eq("status", "completed").then(({ count }) => setHelpedCount(count ?? 0));
  }, [profile?.id]);

  const toggleAvailable = async () => {
    if (!profile) return;
    const next = !profile.is_available;
    setUpdatingAvailability(true);
    updateProfile({ is_available: next });
    const { error } = await supabase.from("profiles").update({ is_available: next }).eq("id", profile.id);
    setUpdatingAvailability(false);
    if (error) {
      updateProfile({ is_available: !next });
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View className="flex-1 bg-[#F5F5F5] p-4">
      <View className="rounded-2xl bg-white p-5">
        <Text className="text-2xl font-bold text-zinc-900">{profile?.full_name ?? "Profile"}</Text>
        <Text className="mt-1 text-sm text-zinc-600">
          {profile?.blood_group ?? "--"} � {profile?.city ?? "--"}
        </Text>
        <Text className="mt-2 text-sm text-zinc-600">Eligibility: {profile?.eligibility_status ?? "eligible"}</Text>
        <Pressable disabled={updatingAvailability} className="mt-4 rounded-xl border border-[#C0392B] px-4 py-3 disabled:opacity-60" onPress={toggleAvailable}>
          <Text className="text-center text-[#C0392B]">
            {updatingAvailability ? "Updating..." : profile?.is_available ? "Set Unavailable" : "Set Available"}
          </Text>
        </Pressable>
        <Pressable className="mt-3 rounded-xl border border-zinc-300 px-4 py-3" onPress={() => router.push("/eligibility")}>
          <Text className="text-center text-zinc-700">Check Eligibility</Text>
        </Pressable>
        <Pressable className="mt-2 rounded-xl border border-zinc-300 px-4 py-3" onPress={() => router.push("/organ-donation")}>
          <Text className="text-center text-zinc-700">Organ Donation</Text>
        </Pressable>
      </View>
      <View className="mt-3 flex-row gap-2">
        <View className="flex-1 rounded-xl bg-white p-3">
          <Text className="text-xl font-bold text-[#C0392B]">{donationCount}</Text>
          <Text className="text-xs text-zinc-600">Donations</Text>
        </View>
        <View className="flex-1 rounded-xl bg-white p-3">
          <Text className="text-xl font-bold text-[#C0392B]">{requestCount}</Text>
          <Text className="text-xs text-zinc-600">Requests Created</Text>
        </View>
        <View className="flex-1 rounded-xl bg-white p-3">
          <Text className="text-xl font-bold text-[#C0392B]">{helpedCount}</Text>
          <Text className="text-xs text-zinc-600">Donors Helped</Text>
        </View>
      </View>
      <Pressable className="mt-4 rounded-xl bg-[#C0392B] px-4 py-3" onPress={() => Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ])}>
        <Text className="text-center text-white">Sign Out</Text>
      </Pressable>
    </View>
  );
}
