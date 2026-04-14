import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { ORGANS } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export default function OrganDonationScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [consentDate, setConsentDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    supabase.from("organ_donation_consents").select("*").eq("user_id", profile.id).single().then(({ data }) => {
      if (!data) return;
      setEnabled(Boolean(data.is_donor));
      setSelected(data.organs ?? []);
      setConsentDate(data.consent_date ?? null);
    });
  }, [profile?.id]);

  const save = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const nextConsentDate = enabled ? new Date().toISOString().slice(0, 10) : null;
    const { error } = await supabase.from("organ_donation_consents").upsert({
      user_id: profile.id,
      is_donor: enabled,
      organs: enabled ? selected : [],
      consent_date: nextConsentDate,
    });
    if (error) {
      setLoading(false);
      return Alert.alert("Error", error.message);
    }
    setConsentDate(nextConsentDate);
    setLoading(false);
    Alert.alert("Saved", "Organ donation preference updated.");
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold text-zinc-900">Organ Donation</Text>
      <Text className="mt-2 text-sm text-zinc-600">Be a life-giver beyond life.</Text>
      <Pressable className="mt-4 rounded-xl border border-[#C0392B] px-4 py-3" onPress={() => setEnabled((v) => !v)}>
        <Text className="text-[#C0392B]">{enabled ? "I wish to be an organ donor" : "Enable donor preference"}</Text>
      </Pressable>
      {enabled ? (
        <>
          <Pressable
            className="mt-3 self-start rounded-full border border-[#C0392B] px-3 py-1"
            onPress={() => setSelected(ORGANS.filter((item) => !selected.includes(item)).length === 0 ? [] : [...ORGANS])}
          >
            <Text className="text-xs text-[#C0392B]">Select All</Text>
          </Pressable>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {ORGANS.map((organ) => {
              const active = selected.includes(organ);
              return (
                <Pressable
                  key={organ}
                  className={`rounded-full border px-3 py-2 ${active ? "border-[#C0392B] bg-red-50" : "border-zinc-300 bg-white"}`}
                  onPress={() => setSelected((prev) => (active ? prev.filter((o) => o !== organ) : [...prev, organ]))}
                >
                  <Text className={active ? "text-[#C0392B]" : "text-zinc-700"}>{organ}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
      <Text className="mt-4 text-xs italic text-zinc-500">
        Your preference indicates intent and may require legal confirmation by local authorities.
      </Text>
      <Pressable disabled={loading} className="mt-6 rounded-xl bg-[#C0392B] py-3 disabled:opacity-70" onPress={save}>
        <Text className="text-center font-semibold text-white">{loading ? "Saving..." : "Save Preference"}</Text>
      </Pressable>
      {consentDate ? <Text className="mt-3 text-center text-sm text-green-700">Registered on {consentDate}</Text> : null}
    </ScrollView>
  );
}
