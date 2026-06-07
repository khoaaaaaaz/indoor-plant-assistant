// src/store/notificationStore.ts
import { create } from 'zustand';

export interface InAppNotification {
  id: string;
  type: 'care' | 'weather' | 'system';
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
  createdAt: string; // ISO string
  isRead: boolean;
}

interface NotificationState {
  notifications: InAppNotification[];
  addNotification: (noti: Omit<InAppNotification, 'id' | 'createdAt' | 'isRead'>) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (noti) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Avoid duplicate notifications of the same type on the same day
    const alreadyExists = get().notifications.some(
      (n) => n.type === noti.type && n.createdAt.startsWith(todayStr)
    );
    
    if (alreadyExists) {
      // Find the existing notification
      const existing = get().notifications.find(
        (n) => n.type === noti.type && n.createdAt.startsWith(todayStr)
      );

      // Only update and trigger state change if values actually changed!
      if (
        existing && (
          existing.titleVi !== noti.titleVi ||
          existing.titleEn !== noti.titleEn ||
          existing.descVi !== noti.descVi ||
          existing.descEn !== noti.descEn
        )
      ) {
        set((state) => ({
          notifications: state.notifications.map((n) => {
            if (n.type === noti.type && n.createdAt.startsWith(todayStr)) {
              return {
                ...n,
                titleVi: noti.titleVi,
                titleEn: noti.titleEn,
                descVi: noti.descVi,
                descEn: noti.descEn,
                isRead: false, // mark as unread if updated
              };
            }
            return n;
          }),
        }));
      }
      return;
    }

    const newNoti: InAppNotification = {
      ...noti,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    set((state) => ({
      notifications: [newNoti, ...state.notifications],
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    }));
  },

  clearNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.isRead).length;
  },
}));
