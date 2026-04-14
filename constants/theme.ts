export const COLORS = {
  primary: "#C0392B",
  background: "#F5F5F5",
  surface: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#555555",
  textMuted: "#999999",
  border: "#E5E5E5",
  urgency: {
    normal: "#27AE60",
    urgent: "#E67E22",
    critical: "#C0392B",
  },
  eligible: "#27AE60",
  temporary: "#E67E22",
  notEligible: "#C0392B",
  tabActive: "#C0392B",
  tabInactive: "#AAAAAA",
};

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export const ORGANS = [
  "Heart",
  "Kidneys",
  "Liver",
  "Lungs",
  "Pancreas",
  "Intestines",
  "Corneas",
  "Skin",
  "Bone Marrow",
] as const;
