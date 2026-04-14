import { create } from "zustand";
import { BloodRequest } from "@/lib/types";

type Filter = "all" | "normal" | "urgent" | "critical";
type SortBy = "distance" | "urgency" | "newest";

interface RequestStore {
  requests: BloodRequest[];
  filter: Filter;
  sortBy: SortBy;
  isLoading: boolean;
  setRequests: (requests: BloodRequest[]) => void;
  addRequest: (request: BloodRequest) => void;
  setFilter: (filter: Filter) => void;
  setSortBy: (sortBy: SortBy) => void;
  setIsLoading: (isLoading: boolean) => void;
  getFilteredAndSorted: () => BloodRequest[];
}

const urgencyOrder: Record<Exclude<Filter, "all">, number> = { critical: 1, urgent: 2, normal: 3 };

export const useRequestStore = create<RequestStore>((set, get) => ({
  requests: [],
  filter: "all",
  sortBy: "distance",
  isLoading: false,
  setRequests: (requests) => set({ requests }),
  addRequest: (request) => set((state) => ({ requests: [request, ...state.requests] })),
  setFilter: (filter) => set({ filter }),
  setSortBy: (sortBy) => set({ sortBy }),
  setIsLoading: (isLoading) => set({ isLoading }),
  getFilteredAndSorted: () => {
    const { requests, filter, sortBy } = get();
    const filtered = filter === "all" ? requests : requests.filter((r) => r.urgency === filter);
    const sos = filtered.filter((r) => r.is_sos);
    const nonSos = filtered.filter((r) => !r.is_sos);
    nonSos.sort((a, b) => {
      if (sortBy === "newest") return +new Date(b.created_at) - +new Date(a.created_at);
      if (sortBy === "urgency") return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      return (a.distance ?? Number.MAX_VALUE) - (b.distance ?? Number.MAX_VALUE);
    });
    sos.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return [...sos, ...nonSos];
  },
}));
