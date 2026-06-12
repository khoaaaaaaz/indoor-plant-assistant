// src/pages/MyGarden.tsx
//
// Gallery view of all user plants.
// Reuses plantStore data (zero extra API calls).
// CSS Grid + CSS animations (no framer-motion or masonry dependency).
//

import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, Droplets, Leaf, AlertTriangle, Camera } from 'lucide-react';
import { usePlantStore } from '@/store/plantStore';
import { useAuth } from '@clerk/react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { CuteYellowFlowerPlant } from '@/components/icons/cute-plants';
import type { Plant } from '@/types';

// ─── Watering Status Helper ──────────────────────────────
// Uses LOCAL date components (not toISOString) to avoid
// timezone shift in UTC+ regions (Lesson #8).
function getWateringInfo(dateStr: string | null, t: (key: string, opts?: Record<string, unknown>) => string) {
  if (!dateStr) return { label: t('garden.waterNotSet'), color: 'text-muted-foreground', urgent: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const waterDate = new Date(dateStr + 'T00:00:00');

  const diffDays = Math.ceil(
    (waterDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return { label: t('garden.waterOverdue'), color: 'text-rose-500', urgent: true };
  if (diffDays === 0) return { label: t('garden.waterToday'), color: 'text-amber-600 dark:text-amber-400', urgent: true };
  if (diffDays === 1) return { label: t('garden.waterTomorrow'), color: 'text-sky-600 dark:text-sky-400', urgent: false };
  return { label: t('garden.waterInDays', { days: diffDays }), color: 'text-muted-foreground', urgent: false };
}

// ─── Garden Plant Card ────────────────────────────────────
// Memoized to prevent re-renders when siblings change.
const GardenPlantCard = React.memo(function GardenPlantCard({
  plant,
  index,
}: {
  plant: Plant;
  index: number;
}) {
  const { t } = useTranslation();
  const watering = getWateringInfo(plant.next_water_date, t);

  return (
    <Link
      to={`/plants/${plant.id}`}
      className="garden-card group relative bg-card rounded-[28px] overflow-hidden
        border border-border/40 cursor-pointer block focus:outline-none
        focus-visible:ring-2 focus-visible:ring-primary/40"
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      {/* ── Image Section ── */}
      <div className="relative w-full aspect-[4/5] bg-muted overflow-hidden">
        {plant.image_url ? (
          <img
            src={plant.image_url}
            alt={plant.name}
            className="w-full h-full object-cover transition-transform duration-700
              group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full bg-gradient-to-br from-accent/40 to-primary/20
              flex items-center justify-center transition-transform duration-700
              group-hover:scale-105"
          >
            <Leaf className="h-16 w-16 text-primary/30" />
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-80" />

        {/* Floating watering badge (top-right, glassmorphism) */}
        <div className="absolute top-3 right-3">
          <div
            className={`bg-white/90 dark:bg-card/90 backdrop-blur-md px-3 py-1.5
              rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5
              ${watering.color}`}
          >
            <Droplets size={12} className={watering.urgent ? 'fill-current' : ''} />
            {watering.label}
          </div>
        </div>

        {/* Disease warning badge (top-left) */}
        {plant.has_active_disease && (
          <div className="absolute top-3 left-3">
            <div
              className="bg-rose-500/90 backdrop-blur-md px-3 py-1.5 rounded-full
                text-xs font-bold text-white shadow-sm flex items-center gap-1.5"
            >
              <AlertTriangle size={12} />
              {t('garden.activeDisease')}
            </div>
          </div>
        )}

        {/* Plant name overlay (bottom of image) */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-[11px] font-semibold text-white/75 uppercase tracking-widest mb-0.5 truncate">
            {plant.species || 'Unknown species'}
          </p>
          <h3 className="font-headline text-[26px] leading-tight font-medium truncate">
            {plant.name}
          </h3>
        </div>
      </div>

      {/* ── Info Footer ── */}
      <div className="p-4 flex items-center gap-2">
        {plant.sunlight_requirement && (
          <span
            className="bg-accent/30 dark:bg-accent/15 text-accent-foreground px-3 py-1.5
              rounded-full text-xs font-medium truncate"
          >
            ☀️ {plant.sunlight_requirement}
          </span>
        )}
        {plant.care_level && (
          <span
            className="bg-muted text-muted-foreground px-3 py-1.5
              rounded-full text-xs font-medium truncate"
          >
            🌱 {plant.care_level}
          </span>
        )}
      </div>
    </Link>
  );
});

// ─── Main Page Component ──────────────────────────────────
export default function MyGarden() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

  // Zustand selectors — only subscribe to what we need
  const plants = usePlantStore((s) => s.plants);
  const loading = usePlantStore((s) => s.loading);
  const fetchPlants = usePlantStore((s) => s.fetchPlants);

  const safePlants = Array.isArray(plants) ? plants : [];

  // Fetch plants if store is empty (direct navigation to /garden)
  useEffect(() => {
    if (isSignedIn) {
      fetchPlants();
    }
  }, [isSignedIn, fetchPlants]);

  // ─── Local Search State ───
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlants = useMemo(() => {
    if (!searchTerm.trim()) return safePlants;
    const query = searchTerm.toLowerCase();
    return safePlants.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.species && p.species.toLowerCase().includes(query))
    );
  }, [safePlants, searchTerm]);

  // ─── Loading Skeleton ───
  if (loading && safePlants.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-12 w-full max-w-md rounded-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-[28px] overflow-hidden border border-border/40">
              <Skeleton className="aspect-[4/5] w-full" />
              <div className="p-4">
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ─── Header ─── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-headline-lg-mobile md:text-headline-xl text-primary font-semibold mb-1">
            {t('garden.title')} 🪴
          </h1>
          <p className="text-body-md text-muted-foreground">
            {safePlants.length > 0
              ? t('garden.subtitle', { count: safePlants.length })
              : t('garden.subtitleEmpty')}
          </p>
        </div>
        <button
          onClick={() => navigate('/?scan=true')}
          className="self-start sm:self-end bg-primary text-primary-foreground
            px-5 py-2.5 rounded-full text-label-sm font-semibold
            flex items-center gap-2 shadow-sm hover:shadow-md hover:bg-primary/90
            transition-all active:scale-[0.98] shrink-0"
        >
          <Plus size={18} />
          {t('garden.addNew')}
        </button>
      </header>

      {/* ─── Search Bar ─── */}
      {safePlants.length > 0 && (
        <div className="relative w-full max-w-md">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <input
            type="text"
            placeholder={t('garden.searchPlaceholder')}
            className="w-full bg-card border border-border/50 rounded-full py-3 pl-11 pr-4
              text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm
              transition-shadow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {/* ─── Content ─── */}
      {safePlants.length === 0 ? (
        /* Empty garden state */
        <div
          className="bg-card border-2 border-dashed border-border rounded-3xl p-12
            flex flex-col items-center justify-center text-center"
        >
          <CuteYellowFlowerPlant size={96} className="mb-4 opacity-80" />
          <h3 className="font-headline text-xl text-primary font-medium mb-2">
            {t('dashboard.noPlants')}
          </h3>
          <p className="text-body-md text-muted-foreground mb-6 max-w-sm">
            {t('dashboard.scanFirst')}
          </p>
          <button
            onClick={() => navigate('/?scan=true')}
            className="bg-primary text-primary-foreground rounded-full py-3 px-6
              text-label-sm font-semibold flex items-center gap-2 shadow-sm
              hover:shadow-md hover:bg-primary/90 transition-all active:scale-[0.98]"
          >
            <Camera className="h-4 w-4" />
            {t('dashboard.scanFirst')}
          </button>
        </div>
      ) : filteredPlants.length === 0 ? (
        /* No search results */
        <div className="py-16 text-center flex flex-col items-center justify-center">
          <div
            className="w-20 h-20 bg-muted rounded-full flex items-center justify-center
              text-primary mb-5"
          >
            <Search size={36} className="opacity-40" />
          </div>
          <h3 className="font-headline text-xl text-primary font-medium mb-2">
            {t('garden.noResults')}
          </h3>
          <p className="text-body-md text-muted-foreground max-w-md">
            {t('garden.noResultsDesc')}
          </p>
        </div>
      ) : (
        /* Plant Grid */
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6"
        >
          {filteredPlants.map((plant, i) => (
            <GardenPlantCard key={plant.id} plant={plant} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
