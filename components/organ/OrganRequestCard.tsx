import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { OrganRequest } from "@/lib/types";
import { COLORS } from "@/constants/theme";
import { router } from "expo-router";

interface Props {
  request: OrganRequest;
  isRegisteredDonor?: boolean;
}

export function OrganRequestCard({ request, isRegisteredDonor }: Props) {
  const urgencyColors = {
    planned: "#27AE60",
    urgent: "#E67E22",
    critical: "#C0392B",
  };

  const accentColor = urgencyColors[request.urgency] || urgencyColors.urgent;

  return (
    <Pressable 
      style={styles.card} 
      onPress={() => router.push(`/organ/${request.id}`)}
    >
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.urgencyBadge, { backgroundColor: accentColor + "15" }]}>
            <Text style={[styles.urgencyText, { color: accentColor }]}>
              {request.urgency.toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.tagRow}>
            <View style={styles.organTag}>
              <Text style={styles.organTagText}>{request.organ_needed}</Text>
            </View>
            <View style={styles.bloodTag}>
              <Text style={styles.bloodTagText}>{request.blood_group_needed}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.patientName}>{request.patient_name}</Text>
        <Text style={styles.hospitalName} numberOfLines={1}>
          <Ionicons name="location-sharp" size={12} color="#888" /> {request.hospital_name}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.deadline}>
            Needed by {request.deadline ? new Date(request.deadline).toLocaleDateString() : "ASAP"}
          </Text>
          {isRegisteredDonor && (
            <View style={styles.matchBadge}>
              <Ionicons name="sparkles" size={12} color="#8E44AD" />
              <Text style={styles.matchText}>You can help</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    marginBottom: 16,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  accentBar: {
    width: 5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: "800",
  },
  tagRow: {
    flexDirection: "row",
    gap: 6,
  },
  organTag: {
    backgroundColor: "#8E44AD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  organTagText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
  },
  bloodTag: {
    backgroundColor: "#C0392B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bloodTagText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
  },
  patientName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  hospitalName: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    paddingTop: 12,
  },
  deadline: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
  },
  matchBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  matchText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#8E44AD",
  },
});
