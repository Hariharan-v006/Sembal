import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BLOOD_GROUPS } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useLocation } from "@/hooks/useLocation";

const schema = z.object({
  patient_name: z.string().min(2, "Patient name is required"),
  hospital_name: z.string().min(2, "Hospital name is required"),
  hospital_address: z.string().min(4, "Hospital address is required"),
  contact_number: z.string().min(8, "Contact number is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CreateRequestScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { coords } = useLocation();
  const [bloodGroup, setBloodGroup] = useState<(typeof BLOOD_GROUPS)[number]>("O+");
  const [units, setUnits] = useState(1);
  const [urgency, setUrgency] = useState<"normal" | "urgent" | "critical">("normal");
  const [expiresIn, setExpiresIn] = useState<"12" | "24" | "48" | "none">("24");
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contact_number: profile?.phone ?? "",
      patient_name: "",
      hospital_name: "",
      hospital_address: "",
      notes: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!profile?.id || !coords) return;
    const expires_at =
      expiresIn === "none" ? null : new Date(Date.now() + Number(expiresIn) * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("blood_requests").insert({
      requester_id: profile.id,
      patient_name: values.patient_name,
      blood_group: bloodGroup,
      units_needed: units,
      urgency,
      hospital_name: values.hospital_name,
      hospital_address: values.hospital_address,
      latitude: coords.latitude,
      longitude: coords.longitude,
      contact_number: values.contact_number,
      notes: values.notes || null,
      status: "open",
      is_sos: false,
      expires_at,
    });
    if (error) return Alert.alert("Error", error.message);
    Alert.alert("Success", "Request posted. Nearby donors have been notified.");
    router.replace("/(tabs)");
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-xl font-semibold text-zinc-900">New Blood Request</Text>
      <Controller
        control={control}
        name="patient_name"
        render={({ field: { value, onChange } }) => (
          <TextInput className="mt-4 h-12 rounded-xl border border-zinc-200 px-4" placeholder="Patient Name" value={value} onChangeText={onChange} />
        )}
      />
      {errors.patient_name ? <Text className="mt-1 text-xs text-[#C0392B]">{errors.patient_name.message}</Text> : null}
      <Text className="mt-3 text-sm font-semibold text-zinc-600">Blood Group</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {BLOOD_GROUPS.map((g) => (
          <Pressable key={g} className={`rounded-full border px-4 py-2 ${bloodGroup === g ? "border-[#C0392B] bg-[#C0392B]" : "border-zinc-300"}`} onPress={() => setBloodGroup(g)}>
            <Text className={bloodGroup === g ? "text-white" : "text-zinc-700"}>{g}</Text>
          </Pressable>
        ))}
      </View>
      <Controller
        control={control}
        name="hospital_name"
        render={({ field: { value, onChange } }) => (
          <TextInput className="mt-3 h-12 rounded-xl border border-zinc-200 px-4" placeholder="Hospital Name" value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="hospital_address"
        render={({ field: { value, onChange } }) => (
          <TextInput className="mt-3 rounded-xl border border-zinc-200 px-4 py-3" multiline placeholder="Hospital Address" value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="contact_number"
        render={({ field: { value, onChange } }) => (
          <TextInput className="mt-3 h-12 rounded-xl border border-zinc-200 px-4" placeholder="Contact Number" value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field: { value, onChange } }) => (
          <TextInput className="mt-3 rounded-xl border border-zinc-200 px-4 py-3" multiline placeholder="Additional notes (optional)" value={value} onChangeText={onChange} />
        )}
      />
      <View className="mt-3 flex-row gap-2">
        {(["normal", "urgent", "critical"] as const).map((u) => (
          <Pressable key={u} className={`flex-1 rounded-xl border py-2 ${urgency === u ? "bg-[#C0392B] border-[#C0392B]" : "border-zinc-300"}`} onPress={() => setUrgency(u)}>
            <Text className={`text-center ${urgency === u ? "text-white" : "text-zinc-700"}`}>{u}</Text>
          </Pressable>
        ))}
      </View>
      <View className="mt-3 flex-row items-center justify-between">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-zinc-100" onPress={() => setUnits((u) => Math.max(1, u - 1))}><Text>-</Text></Pressable>
        <Text className="text-xl font-semibold">{units}</Text>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-zinc-100" onPress={() => setUnits((u) => Math.min(10, u + 1))}><Text>+</Text></Pressable>
      </View>
      <Text className="mt-3 text-sm font-semibold text-zinc-600">Expires In</Text>
      <View className="mt-2 flex-row gap-2">
        {(["12", "24", "48", "none"] as const).map((t) => (
          <Pressable key={t} className={`rounded-lg border px-3 py-2 ${expiresIn === t ? "border-[#C0392B] bg-red-50" : "border-zinc-300"}`} onPress={() => setExpiresIn(t)}>
            <Text className={expiresIn === t ? "text-[#C0392B]" : "text-zinc-600"}>{t === "none" ? "No expiry" : `${t} hrs`}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable disabled={isSubmitting} className="mb-8 mt-6 h-12 items-center justify-center rounded-xl bg-[#C0392B]" onPress={handleSubmit(onSubmit)}>
        <Text className="font-semibold text-white">{isSubmitting ? "Posting..." : "Post Blood Request"}</Text>
      </Pressable>
    </ScrollView>
  );
}
