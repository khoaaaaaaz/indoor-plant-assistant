// src/store/adminStore.ts
import { create } from 'zustand';
import { adminApi } from '@/services/api';
import type { AdminStats, FeedbackEntry, FeedbackSummaryResponse } from '@/types';

interface AdminState {
  isAdmin: boolean;
  checkedAccess: boolean;
  stats: AdminStats | null;
  feedbacks: FeedbackEntry[];
  feedbackSummary: FeedbackSummaryResponse | null;
  
  loadingMe: boolean;
  loadingStats: boolean;
  loadingFeedbacks: boolean;
  loadingSummary: boolean;
  error: string | null;

  checkAdmin: () => Promise<boolean>;
  fetchStats: () => Promise<void>;
  fetchFeedbacks: (limit?: number, offset?: number) => Promise<void>;
  fetchFeedbackSummary: () => Promise<void>;
  clearError: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  isAdmin: false,
  checkedAccess: false,
  stats: null,
  feedbacks: [],
  feedbackSummary: null,
  
  loadingMe: false,
  loadingStats: false,
  loadingFeedbacks: false,
  loadingSummary: false,
  error: null,

  checkAdmin: async () => {
    // Return cached value if already checked to avoid redundant calls on every sidebar render
    set({ loadingMe: true });
    try {
      const response = await adminApi.checkAccess();
      const is_admin = response.data.is_admin;
      set({ isAdmin: is_admin, checkedAccess: true, loadingMe: false, error: null });
      return is_admin;
    } catch (error: any) {
      set({ isAdmin: false, checkedAccess: true, loadingMe: false });
      return false;
    }
  },

  fetchStats: async () => {
    set({ loadingStats: true, error: null });
    try {
      const response = await adminApi.getStats();
      set({ stats: response.data, loadingStats: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Failed to load stats',
        loadingStats: false,
      });
    }
  },

  fetchFeedbacks: async (limit = 50, offset = 0) => {
    set({ loadingFeedbacks: true, error: null });
    try {
      const response = await adminApi.getFeedbacks(limit, offset);
      set({ feedbacks: response.data.items, loadingFeedbacks: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Failed to load feedback logs',
        loadingFeedbacks: false,
      });
    }
  },

  fetchFeedbackSummary: async () => {
    set({ loadingSummary: true, error: null });
    try {
      const response = await adminApi.getFeedbackSummary();
      set({ feedbackSummary: response.data, loadingSummary: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Failed to load feedback summary',
        loadingSummary: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
