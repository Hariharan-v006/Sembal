import { create } from "zustand";

export interface AppNotification {
  id: string;
  user_id: string;
  type: "blood_request" | "sos" | "response" | "system" | "organ_request" | "organ_response";
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  setNotifications: (n: AppNotification[]) => void;
  addNotification: (n: AppNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.is_read).length,
    }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
    })),
  markAsRead: (id) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        unreadCount: target && !target.is_read ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    }),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),
}));
