import { create } from "zustand";
import { OrganRequest, OrganUrgency } from "@/lib/types";

interface OrganStore {
  organRequests: OrganRequest[];
  organFilter: string; // 'all' means no filter
  urgencyFilter: OrganUrgency | 'all';
  isLoading: boolean;
  setOrganRequests: (r: OrganRequest[]) => void;
  addOrganRequest: (r: OrganRequest) => void;
  setOrganFilter: (f: string) => void;
  setUrgencyFilter: (u: OrganStore['urgencyFilter']) => void;
  getFiltered: () => OrganRequest[];
}

export const useOrganStore = create<OrganStore>((set, get) => ({
  organRequests: [],
  organFilter: "all",
  urgencyFilter: "all",
  isLoading: false,

  setOrganRequests: (organRequests) => set({ organRequests, isLoading: false }),
  addOrganRequest: (request) => 
    set((state) => ({ 
      organRequests: [request, ...state.organRequests.filter(r => r.id !== request.id)] 
    })),
  
  setOrganFilter: (organFilter) => set({ organFilter }),
  setUrgencyFilter: (urgencyFilter) => set({ urgencyFilter }),

  getFiltered: () => {
    const { organRequests, organFilter, urgencyFilter } = get();
    return organRequests.filter((r) => {
      const matchOrgan = organFilter === "all" || r.organ_needed.toLowerCase() === organFilter.toLowerCase();
      const matchUrgency = urgencyFilter === "all" || r.urgency === urgencyFilter;
      return matchOrgan && matchUrgency;
    });
  },
}));
