// src/store/taskStore.ts
//
// State for daily care tasks (watering, misting, fertilizing, rotating).
//
// Derives tasks from plant data:
//   - Water:     from next_water_date
//   - Mist:      tropical/high-maintenance plants (every 2-3 days)
//   - Fertilize: growing season only, varies by growth rate (21-30 days)
//   - Rotate:    plants with directional light needs (weekly)
//
// Completion persistence:
//   After deriving tasks, fetchTodayCompletions() reads care_history
//   from the backend and marks matching tasks as completed so that
//   completion state survives page reloads within the same day.

import { create } from 'zustand';
import { careHistoryApi } from '@/services/api';
import type { Plant, CareAdjustments } from '@/types';
import { toast } from 'sonner';

// ─── Derived Task Type ──────────────────────────────────
export interface DerivedCareTask {
  id: string;              // Composite: "{type}-{plantId}" or "{type}-{plantId}-{date}"
  plantId: number;
  plantName: string;
  actionType: 'water' | 'mist' | 'fertilize' | 'rotate';
  dueDate: string;         // ISO date YYYY-MM-DD
  isOverdue: boolean;
  isCompleted: boolean;
}

// Active disease adjustments keyed by plantId
export type DiseaseAdjustmentsMap = Record<number, CareAdjustments | null>;

interface TaskState {
  tasks: DerivedCareTask[];
  completedToday: Record<string, boolean>; // taskId → true (session-only)
  lastFetchedDateStr: string | null;
  loading: boolean;

  deriveTasks: (plants: Plant[], diseaseAdjustments?: DiseaseAdjustmentsMap) => void;
  fetchTodayCompletions: (plants: Plant[]) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  resetTasks: () => void;
}

// ─── Helpers ─────────────────────────────────────────────
const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const daysBetween = (a: Date, b: Date) =>
  Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  completedToday: {},
  lastFetchedDateStr: null,
  loading: false,

  // ─── Derive Tasks from Plants ──────────────────────────
  deriveTasks: (plants: Plant[], diseaseAdjustments: DiseaseAdjustmentsMap = {}) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentMonth = today.getMonth(); // 0-11
    const isGrowingSeason = currentMonth >= 2 && currentMonth <= 8; // Mar–Sep
    const completed = get().completedToday;

    const tasks: DerivedCareTask[] = [];

    plants.forEach((plant) => {
      const bd = plant.botanical_data;
      const adj = diseaseAdjustments[plant.id]; // Active disease adjustments (if any)

      // ── 1. WATER — from next_water_date (existing logic) ──
      if (plant.next_water_date) {
        const due = new Date(plant.next_water_date + 'T00:00:00'); // parse as local
        due.setHours(0, 0, 0, 0);
        const id = `water-${plant.id}`;
        tasks.push({
          id,
          plantId: plant.id,
          plantName: plant.name,
          actionType: 'water',
          dueDate: toDateStr(due),
          isOverdue: due <= today,
          isCompleted: !!completed[id],
        });
      }

      // Need created_at for recurring task calculations
      if (!plant.created_at) return;
      const created = new Date(plant.created_at);
      created.setHours(0, 0, 0, 0);

      // ── 2. MIST — tropical or high-maintenance (skip drought-tolerant) ──
      const shouldMist =
        !bd?.drought_tolerant &&
        (bd?.maintenance === 'High' || bd?.tropical === true);
      // Use disease-adjusted mist frequency if available
      const mistDays = adj?.mist_frequency_days
        ?? (bd?.maintenance === 'High' ? 2 : 3);

      // ── 3. FERTILIZE — growing season, varies by growth rate ──
      // Skip if disease care_adjustments says fertilize_pause
      const diseasePausesFertilize = adj?.fertilize_pause === true;
      const shouldFertilize = isGrowingSeason && bd?.maintenance !== 'Low' && !diseasePausesFertilize;
      const fertilizeDays = bd?.growth_rate === 'Fast' ? 21 : 30;

      // ── 4. ROTATE — directional-light plants (weekly) ──
      // Exclude "shade" / "low light" plants
      const sun = (plant.sunlight_requirement || '').toLowerCase();
      const shouldRotate =
        sun.length > 0 &&
        !sun.includes('shade') &&
        !sun.includes('low light') &&
        !sun.includes('low');
      const rotateDays = 7;

      // Generate recurring tasks for a 45-day rolling window
      for (let offset = 0; offset <= 45; offset++) {
        const target = new Date(today);
        target.setDate(today.getDate() + offset);
        const gap = daysBetween(created, target);
        if (gap < 0) continue;

        const dateStr = toDateStr(target);

        if (shouldMist && gap % mistDays === 0) {
          const id = `mist-${plant.id}-${dateStr}`;
          tasks.push({
            id,
            plantId: plant.id,
            plantName: plant.name,
            actionType: 'mist',
            dueDate: dateStr,
            isOverdue: false,
            isCompleted: !!completed[id],
          });
        }

        if (shouldFertilize && gap % fertilizeDays === 0) {
          const id = `fertilize-${plant.id}-${dateStr}`;
          tasks.push({
            id,
            plantId: plant.id,
            plantName: plant.name,
            actionType: 'fertilize',
            dueDate: dateStr,
            isOverdue: false,
            isCompleted: !!completed[id],
          });
        }

        if (shouldRotate && gap % rotateDays === 0) {
          const id = `rotate-${plant.id}-${dateStr}`;
          tasks.push({
            id,
            plantId: plant.id,
            plantName: plant.name,
            actionType: 'rotate',
            dueDate: dateStr,
            isOverdue: false,
            isCompleted: !!completed[id],
          });
        }
      }
    });

    // Sort: overdue first, then by date
    tasks.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    set({ tasks });
  },

  // ─── Fetch Today's Completions from Backend ────────────
  // Reads care_history for each plant and marks tasks whose
  // action_type + date match a record logged today.
  fetchTodayCompletions: async (plants: Plant[]) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Tối ưu hóa: Tránh gọi lại API nếu đã lấy dữ liệu history của hôm nay rồi
    if (get().lastFetchedDateStr === todayStr) return;

    try {
      // Fetch care history for all plants concurrently
      const results = await Promise.all(
        plants.map((p) =>
          careHistoryApi.getByPlant(p.id)
            .then((res) => ({ plantId: p.id, history: res.data }))
            .catch(() => ({ plantId: p.id, history: [] }))
        )
      );

      // Build a set of completed task IDs for today
      const completed: Record<string, boolean> = { ...get().completedToday };

      results.forEach(({ plantId, history }) => {
        history.forEach((record) => {
          // action_date is ISO datetime, extract date part
          const recordDate = record.action_date.slice(0, 10);
          if (recordDate === todayStr) {
            // Match the composite task ID format used by deriveTasks
            if (record.action_type === 'water') {
              completed[`water-${plantId}`] = true;
            } else {
              // mist, fertilize, rotate use date-based IDs
              completed[`${record.action_type}-${plantId}-${todayStr}`] = true;
            }
          }
        });
      });

      // Update tasks with restored completion state
      set((state) => ({
        completedToday: completed,
        lastFetchedDateStr: todayStr,
        tasks: state.tasks.map((t) =>
          completed[t.id] ? { ...t, isCompleted: true } : t
        ),
      }));
    } catch (error) {
      console.error('Failed to fetch today completions:', error);
    }
  },

  // ─── Mark Task Complete ────────────────────────────────
  completeTask: async (taskId: string) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic UI update + persist completion
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, isCompleted: true } : t
      ),
      completedToday: { ...state.completedToday, [taskId]: true },
    }));
    toast.success('Care task completed! 🌱');

    // Persist to backend
    try {
      await careHistoryApi.logAction(task.plantId, {
        action_type: task.actionType,
        notes: `Completed via care checklist`,
        task_due_date: task.dueDate,
      });
      // Sync the new next_water_date for the watered plant.
      // We call fetchPlant (single plant) instead of fetchPlants (all plants)
      // because fetchPlants has a cache guard (`if plants.length > 0 return`)
      // that will always skip the API call when the store already has data.
      if (task.actionType === 'water') {
        const { usePlantStore } = await import('./plantStore');
        await usePlantStore.getState().fetchPlant(task.plantId);
      }
    } catch (error) {
      // Revert on failure
      console.error('Failed to log care action:', error);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, isCompleted: false } : t
        ),
        completedToday: { ...state.completedToday, [taskId]: false },
      }));
      toast.error('Failed to record care action');
    }
  },

  resetTasks: () => set({ tasks: [], completedToday: {}, lastFetchedDateStr: null, loading: false }),
}));
