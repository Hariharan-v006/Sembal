export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type UrgencyLevel = "normal" | "urgent" | "critical";
export type EligibilityStatus = "eligible" | "not_eligible" | "temporary";
export type RequestStatus = "open" | "fulfilled" | "cancelled" | "expired";
export type ResponseStatus = "accepted" | "declined" | "pending" | "completed";
export type NotificationType = "blood_request" | "sos" | "response" | "system";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  blood_group: BloodGroup;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  eligibility_status: EligibilityStatus;
  last_donation_date: string | null;
  is_available: boolean;
  avatar_url: string | null;
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface BloodRequest {
  id: string;
  requester_id: string;
  patient_name: string;
  blood_group: BloodGroup;
  units_needed: number;
  urgency: UrgencyLevel;
  hospital_name: string;
  hospital_address: string;
  latitude: number;
  longitude: number;
  contact_number: string;
  notes: string | null;
  status: RequestStatus;
  is_sos: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  requester?: Profile;
  distance?: number;
}

export type OrganRequestStatus = 'open' | 'matched' | 'fulfilled' | 'cancelled' | 'expired';
export type OrganUrgency = 'planned' | 'urgent' | 'critical';

export interface OrganRequest {
  id: string;
  requester_id: string;
  patient_name: string;
  patient_age: number | null;
  patient_gender: 'male' | 'female' | 'other' | null;
  organ_needed: string;
  blood_group_needed: BloodGroup;
  hospital_name: string;
  hospital_address: string;
  contact_number: string;
  medical_notes: string | null;
  latitude: number;
  longitude: number;
  urgency: OrganUrgency;
  status: OrganRequestStatus;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  requester?: Profile;
  distance?: number;
}

export interface OrganDonorResponse {
  id: string;
  request_id: string;
  donor_id: string;
  status: ResponseStatus;
  message: string | null;
  responded_at: string;
  created_at: string;
  request?: OrganRequest;
  donor?: Profile;
}
