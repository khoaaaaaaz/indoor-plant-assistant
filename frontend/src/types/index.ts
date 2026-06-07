// src/types/index.ts
//
// These interfaces mirror your backend Pydantic schemas EXACTLY.
// If you add a field in the backend, add it here too.
//
// Backend file reference:
//   - Plant types     → backend/app/schemas/plant.py
//   - Scan types      → backend/app/schemas/scan.py
//   - Disease types   → backend/app/schemas/scan.py
//   - Care types      → backend/app/models/care_history.py

// ─── Botanical Data (JSON blob from Perenual) ─────────────

/** Extended botanical information stored as JSON in the Plant model */
export interface BotanicalData {
  family?: string;
  origin?: string[];
  type?: string;
  description?: string;
  drought_tolerant?: boolean;
  maintenance?: string;
  poisonous_to_humans?: boolean | null;
  medicinal?: boolean;
  indoor?: boolean;
  tropical?: boolean;
  rare?: boolean;
  flowers?: boolean;
  flowering_season?: string | null;
  soil?: string[];
  propagation?: string[];
  pest_susceptibility?: string[];
  pruning_month?: string[];
  cycle?: string;
  growth_rate?: string;
  watering_benchmark?: { value: string; unit: string } | null;
  hardiness?: { min: string; max: string };
  dimensions?: Array<{ min_value: number; max_value: number; unit: string }>;
}

// ─── Plant ───────────────────────────────────────────────

/** Matches backend PlantCreate (what you send TO the API) */
export interface PlantCreate {
  name: string;
  species?: string | null;
  next_water_date?: string | null; // ISO date string "2026-05-20"
  image_url?: string | null;
  sunlight_requirement?: string | null;
  watering_guide?: string | null;
  care_level?: string | null;
  is_toxic_to_pets?: boolean;
  botanical_data?: BotanicalData | null;
}

/** Matches backend PlantUpdate (partial update) */
export interface PlantUpdate {
  name?: string | null;
  species?: string | null;
  next_water_date?: string | null;
  notes?: string | null;
  image_url?: string | null;
}

/** Matches backend PlantResponse (what you GET from the API) */
export interface Plant {
  id: number;
  user_id: number;
  name: string;
  species: string | null;
  next_water_date: string | null;
  // Week 3: Botanical data from Perenual API
  sunlight_requirement: string | null;
  watering_guide: string | null;
  care_level: string | null;
  is_toxic_to_pets: boolean;
  image_url: string | null;
  // Week 4: Extended botanical data (JSON blob)
  botanical_data: BotanicalData | null;
  has_active_disease?: boolean;
  created_at: string; // ISO datetime string
}

// ─── Explore (LLM-generated) ─────────────────────────────

/** Response from /api/plants/:id/explore */
export interface PlantExplore {
  fun_fact: string;
  faqs: Array<{ q: string; a: string }>;
}

// ─── Scan ────────────────────────────────────────────────

/** Matches backend SpeciesScanResponse (Flow 1: "Add to Garden") */
export interface SpeciesScanResult {
  species_identified: string | null;
  confidence: number | null;
  sunlight_requirement: string | null;
  watering_guide: string | null;
  care_level: string | null;
  is_toxic_to_pets: boolean;
  description: string | null;
  botanical_data: BotanicalData | null;
  image_url: string;
}

/** Structured care adjustments from LLM (applied during disease treatment) */
export interface CareAdjustments {
  watering_guide?: string | null;
  watering_frequency_days?: number | null;
  mist_frequency_days?: number | null;
  sunlight_adjustment?: string | null;
  fertilize_pause?: boolean | null;
  notes?: string | null;
  // Snapshots of original values (for safe revert on resolve)
  original_watering_guide?: string | null;
  original_next_water_date?: string | null;
}

/** Matches backend DiseaseScanResponse (Flow 2: "Health Check") */
export interface DiseaseScanResult {
  scan_id: number;
  plant_id: number;
  disease_detected: string | null;
  disease_confidence: number | null;
  env_temperature: number | null;
  env_humidity: number | null;
  soil_moisture: number | null;
  next_water_date: string;
  image_url: string;
  scanned_at: string;
  treatment_recommendation: string | null;
  care_adjustments: CareAdjustments | null;
  // Upgrade 1: Species-disease affinity warning
  species_affinity_warning?: string | null;
}

// ─── Disease Log ─────────────────────────────────────────

/** Matches backend DiseaseLogResponse */
export interface DiseaseLog {
  id: number;
  plant_id: number;
  disease_name: string | null;
  confidence: number | null;
  detected_species: string | null;
  image_url: string | null;
  env_temperature: number | null;
  env_humidity: number | null;
  soil_moisture: number | null;
  scanned_at: string;
  treatment_recommendation: string | null;
  care_adjustments: CareAdjustments | null;
  // Phase 2: Treatment protocol
  treatment_duration_days: number | null;
  expected_resolve_date: string | null;
  // Phase 3: User feedback
  feedback_score: number | null;
  feedback_note: string | null;
  // Upgrade 1: Species-disease affinity warning
  species_affinity_warning?: string | null;
  // Resolution tracking
  resolved_at: string | null;
}

// ─── Care History ────────────────────────────────────────

/** Matches backend CareHistoryCreate (what you send TO the API) */
export interface CareHistoryCreate {
  action_type: string;   // "water", "mist", "fertilize", "rotate", "prune"
  notes?: string | null;
  task_due_date?: string | null;  // ISO date YYYY-MM-DD for server-side validation
}

/** Matches backend CareHistoryResponse (what you GET from the API) */
export interface CareHistoryItem {
  id: number;
  plant_id: number;
  action_type: string;
  action_date: string;   // ISO datetime
  notes: string | null;
}

// ─── API Error ───────────────────────────────────────────

/** Standard error shape from FastAPI */
export interface ApiError {
  detail: string;
}

// ─── Admin Dashboard ──────────────────────────────────────

export interface AdminMeResponse {
  is_admin: boolean;
  email: string | null;
}

export interface AdminStats {
  total_users: number;
  total_plants: number;
  total_scans: number;
  total_diseases_detected: number;
  total_healthy_scans: number;
  total_resolved: number;
  total_feedbacks: number;
  avg_confidence: number;
  disease_distribution: Array<{ disease: string; count: number }>;
  scans_over_time: Array<{ date: string; count: number }>;
  top_species_scanned: Array<{ species: string; count: number }>;
}

export interface FeedbackEntry {
  id: number;
  plant_name: string;
  disease_name: string;
  confidence: number;
  feedback_score: number;
  feedback_note: string | null;
  user_email: string;
  resolved_at: string | null;
  scanned_at: string | null;
}

export interface FeedbackDiseaseSummary {
  feedback_count: number;
  avg_score: number;
  high_confidence_avg_score: number | null;
  low_confidence_avg_score: number | null;
  flag: string | null;
}

export interface FeedbackSummaryResponse {
  total_feedbacks: number;
  note: string;
  per_disease: Record<string, FeedbackDiseaseSummary>;
}

