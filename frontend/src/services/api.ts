// src/services/api.ts
//
// Axios client configured for your FastAPI backend.
// Uses Clerk's session token for authentication.
//
// HOW IT WORKS:
//   1. You call `plantApi.getAll()` from a component
//   2. Axios interceptor runs BEFORE the request
//   3. Interceptor gets Clerk JWT via `window.Clerk.session.getToken()`
//   4. Adds `Authorization: Bearer <jwt>` header
//   5. Request goes to backend
//   6. Backend validates the JWT in dependencies.py
//
// WHY THIS PATTERN:
//   - Single source of truth for API base URL
//   - Auth token injection is automatic (no manual headers)
//   - Error handling is centralized

import axios from 'axios';
import type {
  Plant,
  PlantCreate,
  PlantUpdate,
  PlantExplore,
  SpeciesScanResult,
  DiseaseScanResult,
  DiseaseLog,
  CareHistoryCreate,
  CareHistoryItem,
  AdminMeResponse,
  AdminStats,
  FeedbackEntry,
  FeedbackSummaryResponse,
} from '@/types';

// ─── Create Axios Instance ──────────────────────────────
//
// This creates a "customized" version of axios.
// Every request made through `api` will:
//   - Use the correct base URL
//   - Include the right headers
//   - Have the JWT token attached
//
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
    // Bypass ngrok's browser interstitial page that strips CORS headers
    'ngrok-skip-browser-warning': 'true',
  },
});

// ─── Request Interceptor (JWT Injection) ─────────────────
//
// WHAT: Runs before EVERY request
// WHY: Automatically adds Clerk JWT so you never forget auth
//
// HOW Clerk tokens work:
//   Clerk stores the session client-side.
//   `window.Clerk.session.getToken()` returns a fresh JWT.
//   This JWT is what your backend's `dependencies.py` validates.
//
api.interceptors.request.use(async (config) => {
  try {
    // Get the Clerk session token
    // `window.Clerk` is globally available after ClerkProvider mounts
    const token = await window.Clerk?.session?.getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    // If Clerk isn't ready yet, request goes without auth
    // Backend will return 401, which the response interceptor handles
    console.warn('Could not get Clerk token:', error);
  }

  return config;
});

// ─── Response Interceptor (Error Handling + Token Retry) ──
//
// WHAT: Runs after EVERY response
// WHY: Centralized error handling + automatic 401 retry
//
// TOKEN RETRY: If a request fails with 401, we try to get a fresh
// token from Clerk (skipCache: true) and retry ONCE. This handles:
//   - Token expiry during long sessions
//   - Race conditions on page reload where the token wasn't ready
//
// AUTH PATTERN NOTE:
//   Components should use `isSignedIn` (not `isLoaded`) in useEffect guards
//   that call authenticated API endpoints. `isLoaded` only means "Clerk JS
//   has initialized" — the session token may not be ready yet.
//   Using `isLoaded` causes empty-state flashes and 401 errors on page load.
//
api.interceptors.response.use(
  // Success: just pass through
  (response) => response,

  // Error: handle globally
  async (error) => {
    const originalRequest = error.config;

    // Token retry: if 401 and we haven't retried yet, get a fresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // skipCache: true forces Clerk to fetch a new token instead of
        // returning the same expired cached one
        const token = await window.Clerk?.session?.getToken({ skipCache: true });
        if (token) {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (retryError) {
        console.error('Token refresh failed:', retryError);
      }

      // If retry also failed, Clerk will handle re-authentication
      console.error('Authentication error — token may be expired');
    }

    if (error.response?.status >= 500) {
      console.error('Server error:', error.response?.data?.detail);
    }

    // Re-throw so components can also catch specific errors
    return Promise.reject(error);
  }
);

// ─── Plant API ───────────────────────────────────────────
//
// These functions match your backend routes in:
//   backend/app/api/endpoints/plants.py
//
// Route mapping (from main.py: prefix="/api/plants"):
//   GET    /api/plants        → getAll()
//   GET    /api/plants/:id    → getById(id)
//   POST   /api/plants        → create(data)
//   PUT    /api/plants/:id    → update(id, data)
//   DELETE /api/plants/:id    → remove(id)
//
export const plantApi = {
  getAll: () =>
    api.get<Plant[]>('/api/plants/'),

  getById: (id: number) =>
    api.get<Plant>(`/api/plants/${id}`),

  create: (data: PlantCreate) =>
    api.post<Plant>('/api/plants/', data),

  update: (id: number, data: PlantUpdate) =>
    api.put<Plant>(`/api/plants/${id}`, data),

  remove: (id: number) =>
    api.delete(`/api/plants/${id}`),

  /** Weather-based: skip watering for all plants due today */
  deferWatering: () =>
    api.post('/api/plants/defer-watering'),

  /** Get fun fact + FAQs for a plant (Explore tab) */
  getExplore: (plantId: number, language: string = 'en') =>
    api.get<PlantExplore>(`/api/plants/${plantId}/explore`, {
      params: { language },
    }),

  /** Re-fetch botanical_data from Perenual/LLM (static info only, no care changes) */
  refreshBotanical: (plantId: number) =>
    api.post<Plant>(`/api/plants/${plantId}/refresh-botanical`),
};

// ─── Scan API ────────────────────────────────────────────
//
// These use FormData because they upload images.
// Note: We DON'T set Content-Type header — the browser
// automatically sets it to `multipart/form-data` with
// the correct boundary when you send a FormData object.
//
// Backend routes (from scan.py: prefix="/api"):
//   POST /api/scan/species   → identifySpecies(imageFile)
//   POST /api/scan/disease   → diagnosePlant(plantId, imageFile, coords)
//
export const scanApi = {
  /** Flow 1: Identify a new plant species */
  identifySpecies: (imageFile: File, options?: { signal?: AbortSignal }) => {
    const formData = new FormData();
    formData.append('image', imageFile);

    return api.post<SpeciesScanResult>('/api/scan/species', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: options?.signal,
    });
  },

  /** Flow 2: Diagnose disease on existing plant */
  diagnosePlant: (
    plantId: number,
    imageFile: File,
    latitude?: number,
    longitude?: number,
    language: string = 'en',
    options?: { signal?: AbortSignal }
  ) => {
    const formData = new FormData();
    formData.append('plant_id', plantId.toString());
    formData.append('image', imageFile);
    formData.append('language', language);

    // Optional location for weather context
    if (latitude !== undefined && longitude !== undefined) {
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
    }

    return api.post<DiseaseScanResult>('/api/scan/disease', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: options?.signal,
    });
  },
};

// ─── Disease Logs API ────────────────────────────────────
//
// Backend routes (from scan.py + disease_logs.py):
//   GET   /api/plants/:plantId/disease-logs     → getByPlant(plantId)
//   GET   /api/disease-logs/:logId              → getById(logId)
//   PATCH /api/disease-logs/:logId/resolve      → resolve(logId)
//
export const diseaseLogApi = {
  getByPlant: (plantId: number) =>
    api.get<DiseaseLog[]>(`/api/plants/${plantId}/disease-logs`),

  getById: (logId: number) =>
    api.get<DiseaseLog>(`/api/disease-logs/${logId}`),

  /** Mark a disease as resolved. Reverts care adjustments if unchanged. */
  resolve: (logId: number) =>
    api.patch<DiseaseLog>(`/api/disease-logs/${logId}/resolve`),

  /** Submit treatment effectiveness feedback after resolving a disease */
  submitFeedback: (logId: number, score: number, note?: string) =>
    api.post<DiseaseLog>(`/api/disease-logs/${logId}/feedback`, { score, note }),
};

// ─── Care History API ────────────────────────────────────
//
// Backend routes (from care_history.py, prefix=/api/plants):
//   POST /api/plants/:plantId/care-history  → logAction(plantId, data)
//   GET  /api/plants/:plantId/care-history  → getByPlant(plantId)
//
export const careHistoryApi = {
  logAction: (plantId: number, data: CareHistoryCreate) =>
    api.post<CareHistoryItem>(`/api/plants/${plantId}/care-history`, data),

  getByPlant: (plantId: number) =>
    api.get<CareHistoryItem[]>(`/api/plants/${plantId}/care-history`),
};

// ─── Weather API ─────────────────────────────────────────
export const weatherApi = {
  getCurrent: (latitude: number, longitude: number) =>
    api.get('/api/users/weather', {
      params: { latitude, longitude },
    }),
};

// ─── Admin API ───────────────────────────────────────────
export const adminApi = {
  checkAccess: () =>
    api.get<AdminMeResponse>('/api/admin/me'),

  getStats: () =>
    api.get<AdminStats>('/api/admin/stats'),

  getFeedbacks: (limit: number = 50, offset: number = 0) =>
    api.get<{ items: FeedbackEntry[]; total: number }>('/api/admin/feedbacks', {
      params: { limit, offset },
    }),

  getFeedbackSummary: () =>
    api.get<FeedbackSummaryResponse>('/api/admin/feedback-summary'),

  verifyCache: (type: 'species' | 'disease', name: string) =>
    api.get('/api/admin/verify-cache', {
      params: { type, name },
    }),
};

// Export the raw axios instance for edge cases
export default api;
