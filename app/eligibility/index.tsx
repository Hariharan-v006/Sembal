import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

type Step = 1 | 2 | 3 | 4 | 5;

export default function EligibilityScreen() {
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [step, setStep] = useState<Step>(1);
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [lastDonationDays, setLastDonationDays] = useState("");
  const [severeCondition, setSevereCondition] = useState(false);
  const [recentEvent, setRecentEvent] = useState(false);

  const runCheck = async () => {
    if (!profile?.id) return;
    const ageNum = Number(age);
    const weightNum = Number(weight);
    const donationDays = Number(lastDonationDays || "9999");
    const status = "temporary";
    const reason = "Pending backend eligibility evaluation";
    const { error: insertError } = await supabase.from("eligibility_checks").insert({
      user_id: profile.id,
      status,
      reason,
      eligible_after: null,
      answers: { age: ageNum, weight: weightNum, donation_days: donationDays, severeCondition, recentEvent },
    });
    if (insertError) return Alert.alert("Unable to submit", insertError.message);

    // Backend should compute and sync final eligibility status.
    const rpcResult = await supabase.rpc("refresh_eligibility_status");
    if (rpcResult.error) {
      Alert.alert("Submitted", "Answers saved. Final eligibility will update after backend processing.");
      return;
    }

    const { data: updatedProfile } = await supabase.from("profiles").select("eligibility_status").eq("id", profile.id).single();
    if (updatedProfile?.eligibility_status) updateProfile({ eligibility_status: updatedProfile.eligibility_status });
    Alert.alert("Saved", "Eligibility check submitted.");
  };

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold text-zinc-900">Check Eligibility</Text>
      <Text className="mt-1 text-xs text-zinc-500">Step {step} of 5</Text>
      {step === 1 ? <TextInput className="mt-5 h-12 rounded-xl border border-zinc-200 px-4" placeholder="Age" value={age} onChangeText={setAge} keyboardType="numeric" /> : null}
      {step === 2 ? <TextInput className="mt-5 h-12 rounded-xl border border-zinc-200 px-4" placeholder="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" /> : null}
      {step === 3 ? (
        <TextInput className="mt-5 h-12 rounded-xl border border-zinc-200 px-4" placeholder="Days since last donation (0 if today, blank if never)" value={lastDonationDays} onChangeText={setLastDonationDays} keyboardType="numeric" />
      ) : null}
      {step === 4 ? (
        <Pressable className={`mt-5 rounded-xl border px-4 py-3 ${severeCondition ? "border-[#C0392B] bg-red-50" : "border-zinc-200"}`} onPress={() => setSevereCondition((v) => !v)}>
          <Text className={severeCondition ? "text-[#C0392B]" : "text-zinc-700"}>I have severe condition (HIV/Hepatitis/Active cancer/Heart disease)</Text>
        </Pressable>
      ) : null}
      {step === 5 ? (
        <Pressable className={`mt-5 rounded-xl border px-4 py-3 ${recentEvent ? "border-orange-500 bg-orange-50" : "border-zinc-200"}`} onPress={() => setRecentEvent((v) => !v)}>
          <Text className={recentEvent ? "text-orange-600" : "text-zinc-700"}>Recent surgery, tattoo, pregnancy, travel, or medication</Text>
        </Pressable>
      ) : null}
      <View className="mt-5 flex-row gap-2">
        <Pressable disabled={step === 1} className="flex-1 rounded-xl border border-zinc-300 py-3 disabled:opacity-50" onPress={() => setStep((s) => (Math.max(1, s - 1) as Step))}>
          <Text className="text-center text-zinc-700">Back</Text>
        </Pressable>
        {step < 5 ? (
          <Pressable className="flex-1 rounded-xl bg-[#C0392B] py-3" onPress={() => setStep((s) => (Math.min(5, s + 1) as Step))}>
            <Text className="text-center font-semibold text-white">Next</Text>
          </Pressable>
        ) : (
          <Pressable className="flex-1 rounded-xl bg-[#C0392B] py-3" onPress={runCheck}>
            <Text className="text-center font-semibold text-white">Save Result</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
