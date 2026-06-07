// src/store/plantStore.ts
//
// Global state for the user's plant collection.
//
// WHY ZUSTAND:
//   - Simpler than Redux (no boilerplate)
//   - Works outside React components too
//   - Tiny bundle size (1KB)
//
// IMPORTANT: NO AUTH LOGIC HERE.
//   Auth is handled entirely by Clerk.
//   This store only manages plant data.
//
// HOW TO USE IN A COMPONENT:
//   const { plants, loading, fetchPlants } = usePlantStore();
//
//   useEffect(() => {
//     fetchPlants();    // Load plants when component mounts
//   }, [fetchPlants]);
//
//   return plants.map(p => <PlantCard key={p.id} plant={p} />);

import { create } from 'zustand';
import { plantApi } from '@/services/api';
import type { Plant, PlantCreate, PlantUpdate, DiseaseLog } from '@/types';

// ─── Store Interface ─────────────────────────────────────
//
// This defines the SHAPE of your store.
// Think of it as "what data do I have?" and "what can I do with it?"
//

interface PlantState {
  // Data
  plants: Plant[];
  selectedPlant: Plant | null;
  loading: boolean;
  error: string | null;

  pendingDiseaseLogs: Record<number, boolean>;
  lastDiseaseResult: Record<number, DiseaseLog | null>;

  // Actions
  fetchPlants: () => Promise<void>;
  fetchPlant: (id: number) => Promise<void>;
  addPlant: (data: PlantCreate) => Promise<Plant>;
  addPlantOptimistic: (data: PlantCreate) => number;
  confirmPlant: (tempId: number, realPlant: Plant) => void;
  rollbackPlant: (tempId: number) => void;
  updatePlant: (id: number, data: PlantUpdate) => Promise<void>;
  removePlant: (id: number) => Promise<void>;
  setPendingDiseaseLog: (plantId: number, isPending: boolean) => void;
  setLastDiseaseResult: (plantId: number, log: DiseaseLog | null) => void;
  clearError: () => void;
}

// ─── Create Store ────────────────────────────────────────
//
// `create` returns a React hook (`usePlantStore`).
// Inside `set`, you update the state.
// Inside `get`, you read the current state.
//

export const usePlantStore = create<PlantState>((set, _get) => ({
  // ─── Initial State ───
  plants: [],
  selectedPlant: null,
  loading: false,
  error: null,
  pendingDiseaseLogs: {},
  lastDiseaseResult: {},

  // ─── Fetch All Plants ───
  //
  // Called when Dashboard mounts.
  // Sets loading → fetches → updates plants[] → clears loading.
  //
  fetchPlants: async () => {
    set({ loading: true, error: null });
    try {
      const response = await plantApi.getAll();
      const data = Array.isArray(response.data) ? response.data : [];
      set({ plants: data, loading: false, error: null });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Failed to load plants',
        loading: false,
      });
    }
  },

  // ─── Fetch Single Plant ───
  //
  // Called when PlantDetail page mounts.
  //
  fetchPlant: async (id: number) => {
    if (id < 0) {
      const localPlant = _get().plants.find((p) => p.id === id);
      if (localPlant) {
        set({ selectedPlant: localPlant, error: null, loading: false });
        return;
      }
    }

    set({ loading: true, error: null });
    try {
      const response = await plantApi.getById(id);
      set({ selectedPlant: response.data, loading: false, error: null });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Plant not found',
        loading: false,
      });
    }
  },

  // ─── Add New Plant ───
  //
  // Called after Flow 1 (Species ID) when user confirms "Add to Garden".
  // Returns the new plant so the caller can navigate to it.
  //
  addPlant: async (data: PlantCreate) => {
    set({ loading: true, error: null });
    try {
      const response = await plantApi.create(data);
      const newPlant = response.data;

      set((state) => ({
        plants: [...state.plants, newPlant],
        loading: false,
        error: null,
      }));

      return newPlant;
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Failed to add plant',
        loading: false,
      });
      throw error; // Re-throw so the component can handle it
    }
  },

  // ─── Optimistic Add ───
  addPlantOptimistic: (data: PlantCreate) => {
    const tempId = -Date.now();
    const tempPlant = {
      ...data,
      id: tempId,
      user_id: 0,
      created_at: new Date().toISOString(),
    } as Plant;
    
    set((state) => ({
      plants: [tempPlant, ...state.plants],
    }));
    return tempId;
  },

  confirmPlant: (tempId: number, realPlant: Plant) => {
    set((state) => ({
      plants: state.plants.map((p) => (p.id === tempId ? realPlant : p)),
      selectedPlant: state.selectedPlant?.id === tempId ? realPlant : state.selectedPlant,
    }));
  },

  rollbackPlant: (tempId: number) => {
    set((state) => ({
      plants: state.plants.filter((p) => p.id !== tempId),
      selectedPlant: state.selectedPlant?.id === tempId ? null : state.selectedPlant,
    }));
  },

  // ─── Update Plant ───
  //
  // Called when editing plant details.
  //
  updatePlant: async (id: number, data: PlantUpdate) => {
    set({ loading: true, error: null });
    try {
      const response = await plantApi.update(id, data);
      const updated = response.data;

      set((state) => ({
        plants: state.plants.map((p) => (p.id === id ? updated : p)),
        selectedPlant: state.selectedPlant?.id === id ? updated : state.selectedPlant,
        loading: false,
        error: null,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Failed to update plant',
        loading: false,
      });
    }
  },

  // ─── Remove Plant ───
  //
  // Called from plant detail page.
  // Backend cascades delete to disease_logs and care_history.
  //
  removePlant: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await plantApi.remove(id);

      set((state) => ({
        plants: state.plants.filter((p) => p.id !== id),
        selectedPlant: state.selectedPlant?.id === id ? null : state.selectedPlant,
        loading: false,
        error: null,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Failed to delete plant',
        loading: false,
      });
    }
  },

  setPendingDiseaseLog: (plantId: number, isPending: boolean) => {
    set((state) => ({
      pendingDiseaseLogs: {
        ...state.pendingDiseaseLogs,
        [plantId]: isPending,
      },
    }));
  },

  setLastDiseaseResult: (plantId: number, log: DiseaseLog | null) => {
    set((state) => ({
      lastDiseaseResult: {
        ...state.lastDiseaseResult,
        [plantId]: log,
      },
    }));
  },

  // ─── Clear Error ───
  clearError: () => set({ error: null }),
}));
