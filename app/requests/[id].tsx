import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { BloodRequest } from "@/lib/types";
import { useAuthStore } from "@/stores/authStore";
import { formatTimeAgo } from "@/lib/utils";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";

interface DonorResponse {
  id: string;
  donor_id: string;
  request_id: string;
  status: "pending" | "accepted" | "declined" | "completed";
  created_at: string;
}

export default function RequestDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAuthStore((s) => s.profile);
  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [responses, setResponses] = useState<DonorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const isRequester = request?.requester_id === profile?.id;
  const urgencyStyle: Record<string, string> = {
    normal: "bg-green-600",
    urgent: "bg-orange-500",
    critical: "bg-[#C0392B]",
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase.from("blood_requests").select("*").eq("id", id).single();
      setRequest(data as BloodRequest);
      const { data: responsesData } = await supabase.from("donor_responses").select("*").eq("request_id", id);
      setResponses((responsesData as DonorResponse[]) ?? []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`request-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "donor_responses", filter: `request_id=eq.${id}` }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const accept = async () => {
    if (!profile?.id || !request) return;
    const { error } = await supabase.from("donor_responses").upsert({
      request_id: request.id,
      donor_id: profile.id,
      status: "accepted",
      responded_at: new Date().toISOString(),
    });
    if (error) return Alert.alert("Unable to accept", error.message);
    try {
      await invokeEdgeFunction("notify-donor-accepted", { request_id: request.id, donor_id: profile.id });
    } catch (edgeError) {
      Alert.alert("Accepted", `Accepted request, but notification failed: ${(edgeError as Error).message}`);
    }
    Alert.alert("Accepted", "You have accepted this request.");
    const { data } = await supabase.from("donor_responses").select("*").eq("request_id", request.id);
    setResponses((data as DonorResponse[]) ?? []);
  };

  const decline = async () => {
    if (!profile?.id || !request) return;
    const { error } = await supabase.from("donor_responses").upsert({
      request_id: request.id,
      donor_id: profile.id,
      status: "declined",
      responded_at: new Date().toISOString(),
    });
    if (error) return Alert.alert("Unable to decline", error.message);
    Alert.alert("Declined", "You declined this request.");
  };

  const markFulfilled = async () => {
    if (!request || !isRequester) return;
    const { error } = await supabase.from("blood_requests").update({ status: "fulfilled" }).eq("id", request.id);
    if (error) return Alert.alert("Unable to update request", error.message);
    Alert.alert("Completed", "Request marked as fulfilled.");
    setRequest((prev) => (prev ? { ...prev, status: "fulfilled" } : prev));
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#C0392B" />
      </View>
    );
  }

  const myResponse = responses.find((item) => item.donor_id === profile?.id);

  return (
    <ScrollView className="flex-1 bg-[#F5F5F5] p-4">
      <View className={`rounded-xl px-3 py-2 ${urgencyStyle[request?.urgency ?? "normal"]}`}>
        <Text className="text-center text-xs font-semibold text-white">{(request?.urgency ?? "normal").toUpperCase()} REQUEST</Text>
      </View>
      <View className="mt-3 rounded-xl bg-white p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-zinc-900">{request?.patient_name ?? "Request Details"}</Text>
          <Text className="rounded-full bg-[#C0392B] px-3 py-1 font-semibold text-white">{request?.blood_group}</Text>
        </View>
        <Text className="mt-1 text-sm text-zinc-600">{request?.units_needed} units needed</Text>
        <Text className="mt-1 text-xs text-zinc-500">Posted {request?.created_at ? formatTimeAgo(request.created_at) : "-"}</Text>
        {request?.expires_at ? <Text className="mt-1 text-xs text-zinc-500">Expires {formatTimeAgo(request.expires_at)}</Text> : null}
        <Text className="mt-3 text-sm text-zinc-600">{request?.hospital_name}</Text>
        <Text className="mt-1 text-sm text-zinc-600">{request?.hospital_address}</Text>
      </View>

      <View className="mt-3 rounded-xl bg-white p-4">
        <Text className="text-sm font-semibold text-zinc-800">Contact</Text>
        <Text className="mt-1 text-sm text-zinc-600">{request?.contact_number}</Text>
        <Pressable
          className="mt-3 rounded-xl bg-green-600 py-3"
          onPress={() => {
            if (request?.contact_number) Linking.openURL(`tel:${request.contact_number}`);
          }}
        >
          <Text className="text-center font-semibold text-white">Call Now</Text>
        </Pressable>
      </View>

      {isRequester ? (
        <View className="mt-3 rounded-xl bg-white p-4">
          <Text className="text-sm font-semibold text-zinc-700">Responses ({responses.length})</Text>
          {responses.length === 0 ? <Text className="mt-2 text-sm text-zinc-500">No responses yet.</Text> : null}
          {responses.map((r) => (
            <View key={r.id} className="mt-2 rounded-lg border border-zinc-200 px-3 py-2">
              <Text className="text-sm text-zinc-700">Donor {r.donor_id.slice(0, 6)}...</Text>
              <Text className="text-xs text-zinc-500">{r.status}</Text>
            </View>
          ))}
          {request?.status !== "fulfilled" ? (
            <Pressable className="mt-4 rounded-xl bg-green-600 py-3" onPress={markFulfilled}>
              <Text className="text-center font-semibold text-white">Mark as Fulfilled</Text>
            </Pressable>
          ) : (
            <Text className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-700">This request is fulfilled.</Text>
          )}
        </View>
      ) : (
        <View className="mt-3 rounded-xl bg-white p-4">
          {myResponse?.status === "accepted" ? (
            <Text className="rounded-xl bg-green-50 p-3 text-green-700">You have accepted this request.</Text>
          ) : myResponse?.status === "declined" ? (
            <Text className="rounded-xl bg-zinc-100 p-3 text-zinc-700">You declined this request.</Text>
          ) : (
            <>
              <Pressable className="rounded-xl bg-[#C0392B] py-3" onPress={accept}>
                <Text className="text-center font-semibold text-white">Accept & Respond</Text>
              </Pressable>
              <Pressable className="mt-2 rounded-xl border border-[#C0392B] py-3" onPress={decline}>
                <Text className="text-center font-semibold text-[#C0392B]">Decline</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}
