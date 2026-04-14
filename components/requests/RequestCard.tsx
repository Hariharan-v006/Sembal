import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { BloodRequest } from "@/lib/types";
import { formatDistance, formatTimeAgo } from "@/lib/utils";
import { UrgencyBadge } from "./UrgencyBadge";

export function RequestCard({ request }: { request: BloodRequest }) {
  return (
    <Pressable
      className={`rounded-2xl bg-white p-4 ${request.is_sos ? "border border-red-200 bg-red-50" : ""}`}
      onPress={() => router.push(`/requests/${request.id}`)}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <UrgencyBadge urgency={request.urgency} />
          {request.is_sos ? <Text className="rounded-full bg-[#C0392B] px-2 py-1 text-[10px] font-bold text-white">SOS</Text> : null}
        </View>
        <Text className="rounded-full bg-[#C0392B] px-3 py-1 text-xs font-bold text-white">{request.blood_group}</Text>
      </View>
      <Text className="mt-3 text-base font-semibold text-zinc-900">{request.patient_name}</Text>
      <Text className="text-sm text-zinc-600">{request.hospital_name}</Text>
      <View className="mt-2 flex-row justify-between">
        <Text className="text-xs text-zinc-500">{request.units_needed} units needed</Text>
        <Text className="text-xs text-zinc-500">{typeof request.distance === "number" ? formatDistance(request.distance) : "-"}</Text>
      </View>
      <View className="mt-1 flex-row justify-end">
        <Text className="text-[11px] text-zinc-400">Posted {formatTimeAgo(request.created_at)}</Text>
      </View>
    </Pressable>
  );
}
