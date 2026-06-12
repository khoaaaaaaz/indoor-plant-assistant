// src/pages/PlantDetail.tsx
//
// Full plant profile page with 3-tab layout.
// Tabs: Overview | Care | Explore
// Always-visible: Care History + Disease Logs below tabs.
import { HealthCheckDialog } from '@/components/scan/HealthCheckDialog';
import { DiseaseLogCard } from '@/components/scan/DiseaseLogCard';
import { diseaseLogApi, plantApi } from '@/services/api';
import type { DiseaseLog, PlantExplore } from '@/types';
import { useTranslation } from 'react-i18next';
import { translateSpecies, translateBotanical } from '@/lib/translate';

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/react';
// AUTH PATTERN: Always use `isSignedIn` (not `isLoaded`) in useEffect guards
// that call authenticated API endpoints. `isLoaded` only means "Clerk JS has
// initialized" — the session token may not be ready yet, causing 401 errors.
// See: api.ts response interceptor for the retry mechanism that catches edge cases.
import {
  ArrowLeft, Sun, Droplets, ShieldAlert, ShieldCheck, ShieldQuestion,
  Leaf, Calendar, Activity, Trash2, Sparkles, Bug, Scissors, Sprout,
  HelpCircle, Lightbulb, Flower2, Thermometer, Ruler, RefreshCw, Loader2,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { usePlantStore } from '@/store/plantStore';
import { toast } from 'sonner';
import { careHistoryApi } from '@/services/api';
import type { CareHistoryItem } from '@/types';

export default function PlantDetail() {
  const { plantId } = useParams<{ plantId: string }>();
  const navigate = useNavigate();
  const {
    selectedPlant,
    loading,
    error,
    fetchPlant,
    removePlant,
    pendingDiseaseLogs,
    lastDiseaseResult
  } = usePlantStore();
  const [careHistory, setCareHistory] = useState<CareHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [diseaseLogs, setDiseaseLogs] = useState<DiseaseLog[]>([]);
  const [diseaseLoading, setDiseaseLoading] = useState(false);
  const [healthCheckOpen, setHealthCheckOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exploreData, setExploreData] = useState<PlantExplore | null>(null);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { t, i18n } = useTranslation();
  const { isSignedIn } = useAuth();

  // Reset local state when navigating to a different plant
  useEffect(() => {
    setCareHistory([]);
    setDiseaseLogs([]);
    setExploreData(null);
  }, [plantId]);

  // Fetch disease logs
  useEffect(() => {
    if (isSignedIn && selectedPlant?.id) {
      const cached = lastDiseaseResult[selectedPlant.id];
      if (cached) {
        setDiseaseLogs([cached]);
      }
      fetchDiseaseLogs();
    }
  }, [isSignedIn, selectedPlant?.id]);

  const fetchDiseaseLogs = () => {
    if (!selectedPlant?.id) return;
    setDiseaseLoading(true);
    diseaseLogApi
      .getByPlant(selectedPlant.id)
      .then((res) => setDiseaseLogs(res.data))
      .catch(() => setDiseaseLogs([]))
      .finally(() => setDiseaseLoading(false));
  };

  // Fetch plant data
  useEffect(() => {
    if (isSignedIn && plantId) {
      fetchPlant(Number(plantId));
    }
  }, [isSignedIn, plantId, fetchPlant]);

  // Fetch care history when plant loads
  useEffect(() => {
    if (isSignedIn && selectedPlant?.id) {
      setHistoryLoading(true);
      careHistoryApi
        .getByPlant(selectedPlant.id)
        .then((res) => setCareHistory(res.data))
        .catch(() => setCareHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  }, [isSignedIn, selectedPlant?.id]);

  const handleDelete = async () => {
    try {
      if (selectedPlant?.id) {
        await removePlant(selectedPlant.id);
        setDeleteDialogOpen(false);
        navigate('/');
      }
    } catch (err) {
      // Error handled in store
    }
  };

  // Fetch explore data (lazy — only when Explore tab is clicked)
  const handleExploreTab = () => {
    if (exploreData || exploreLoading || !selectedPlant?.id) return;
    setExploreLoading(true);
    plantApi
      .getExplore(selectedPlant.id, i18n.language)
      .then((res) => setExploreData(res.data))
      .catch(() => setExploreData(null))
      .finally(() => setExploreLoading(false));
  };

  // ─── Loading & Error States ───
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !selectedPlant) {
    return (
      <div className="text-center py-12">
        <p className="text-body-lg text-destructive mb-4">{error || 'Plant not found'}</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          {t('plant.backToGarden')}
        </Button>
      </div>
    );
  }

  const bd = selectedPlant.botanical_data;

  // ─── Active Disease Detection ───
  // The most recent unresolved disease log (null if all resolved or none)
  const activeDiseaseLog = diseaseLogs.find(
    (log) => log.disease_name && !log.resolved_at
  ) || null;

  // Handler: after resolving a disease, refresh logs + plant data (care may revert)
  const handleDiseaseResolved = async () => {
    fetchDiseaseLogs();
    if (selectedPlant?.id) {
      await fetchPlant(selectedPlant.id);
    }
  };

  // ─── Helper: Calculate plant age ───
  const getPlantAge = () => {
    const created = new Date(selectedPlant.created_at);
    const now = new Date();
    const diffMonths =
      (now.getFullYear() - created.getFullYear()) * 12 +
      (now.getMonth() - created.getMonth());
    if (diffMonths < 1) return 'New 🌱';
    if (diffMonths < 12) return `${diffMonths} mo old`;
    const years = Math.floor(diffMonths / 12);
    return `${years} yr${years > 1 ? 's' : ''} old`;
  };

  const acquiredDate = new Date(selectedPlant.created_at).toLocaleDateString(
    i18n.language === 'vi' ? 'vi-VN' : 'en-US',
    { month: 'long', day: 'numeric', year: 'numeric' }
  );

  // Perk badges data
  const perks = [
    bd?.drought_tolerant && { icon: '🏜️', label: t('plantDetail.droughtTolerant') },
    bd?.medicinal && { icon: '💊', label: t('plantDetail.medicinal') },
    bd?.rare && { icon: '✨', label: t('plantDetail.rare') },
    bd?.tropical && { icon: '🌴', label: t('plantDetail.tropical') },
    bd?.indoor && { icon: '🏠', label: t('plantDetail.indoor') },
  ].filter(Boolean) as Array<{ icon: string; label: string }>;

  return (
    <div className="flex flex-col gap-8 overflow-x-hidden">
      {/* ─── Back Button ─── */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary
          transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-label-sm font-semibold">{t('plant.backToGarden')}</span>
      </button>

      {/* ─── Header Section ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <Badge variant="secondary" className="gap-1.5 mb-3">
            <Leaf className="h-3 w-3" />
            <span className="uppercase tracking-wider text-[11px]">
              {translateBotanical(selectedPlant.care_level || 'Growing', t)}
            </span>
          </Badge>
          <h1 className="font-headline text-headline-xl text-primary mb-1">
            {selectedPlant.name}
          </h1>
          <p className="text-body-md text-muted-foreground italic">
            {translateSpecies(selectedPlant.species || 'Unknown species', t)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shadow-md"
            onClick={async () => {
              if (!selectedPlant || refreshing) return;
              setRefreshing(true);
              try {
                await plantApi.refreshBotanical(selectedPlant.id);
                // Re-fetch this specific plant so the detail view updates immediately
                await fetchPlant(selectedPlant.id);
                toast.success('Botanical data refreshed! 🌿');
              } catch (e) {
                console.error('Failed to refresh:', e);
                toast.error('Failed to refresh botanical data');
              } finally {
                setRefreshing(false);
              }
            }}
            disabled={refreshing}
            title="Refresh botanical data"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="rounded-full shadow-md"
            onClick={() => setDeleteDialogOpen(true)}
            title="Delete Plant"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            className="rounded-full px-6 shadow-md gap-2"
            onClick={() => setHealthCheckOpen(true)}
          >
            <Activity className="h-4 w-4" />
            {t('plant.healthCheck')}
          </Button>
        </div>
      </div>

      {/* ─── Active Disease Alert Banner ─── */}
      {activeDiseaseLog && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-headline text-[16px] text-destructive font-semibold">
                  {t('disease.activeAlert', 'Active Disease')}: {activeDiseaseLog.disease_name}
                </h3>
                <Badge variant="outline" className="text-[10px] py-0 border-destructive/30 text-destructive/80">
                  {t('disease.detected', 'Detected')} {new Date(activeDiseaseLog.scanned_at).toLocaleDateString(
                    i18n.language === 'vi' ? 'vi-VN' : 'en-US',
                    { month: 'short', day: 'numeric' }
                  )}
                </Badge>
              </div>

              {/* Care adjustments summary */}
              {activeDiseaseLog.care_adjustments?.notes && (
                <p className="text-[13px] text-amber-700 dark:text-amber-400 mb-2">
                  ⚡ {activeDiseaseLog.care_adjustments.notes}
                </p>
              )}

              {/* Treatment advice */}
              {activeDiseaseLog.treatment_recommendation && (
                <div className="bg-card/80 rounded-lg p-3 mt-2 max-h-40 overflow-y-auto">
                  <p className="text-body-md text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {activeDiseaseLog.treatment_recommendation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Image + Tabs Side-by-Side ─── */}
      <Tabs defaultValue="overview" className="w-full flex-col min-w-0">
        {/* Tab header above both columns */}
        <TabsList className="!w-full grid grid-cols-3 bg-muted/50 rounded-xl h-11 md:max-w-[55%] md:ml-auto">
          <TabsTrigger value="overview" className="rounded-lg text-label-sm font-semibold">
            {t('plantDetail.overview')}
          </TabsTrigger>
          <TabsTrigger value="care" className="rounded-lg text-label-sm font-semibold">
            {t('plantDetail.care')}
          </TabsTrigger>
          <TabsTrigger
            value="explore"
            className="rounded-lg text-label-sm font-semibold"
            onClick={handleExploreTab}
          >
            {t('plantDetail.explore')}
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col md:flex-row gap-6 mt-6">
          {/* ─── Left: Hero Image (sticky on desktop) ─── */}
          <div className="md:w-[45%] shrink-0 md:sticky md:top-6 md:self-start md:max-h-[80vh] md:overflow-hidden">
            <div className="bg-card rounded-3xl overflow-hidden shadow-md
              aspect-square md:aspect-[4/5] relative group border border-border/50 bg-muted/30">
              {selectedPlant.image_url ? (
                <img
                  src={selectedPlant.image_url}
                  alt={selectedPlant.name}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="w-full h-full object-cover relative z-10 group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent/60 via-primary/20
              to-secondary/30 flex items-center justify-center
              group-hover:scale-105 transition-transform duration-700">
                  <Leaf className="h-20 w-20 text-primary/20" />
                </div>
              )}
            </div>
            {/* Info bar below image */}
            <div className="flex justify-between items-center px-1 pt-3">
              <div className="text-sm text-muted-foreground">
                <span className="text-label-sm text-muted-foreground/70">{t('plant.acquired')}</span>{' '}
                <span className="font-medium text-foreground">{acquiredDate}</span>
              </div>
              <span className="text-label-sm font-semibold text-primary bg-accent/30 px-3 py-1 rounded-full">
                {getPlantAge()}
              </span>
            </div>
          </div>

          {/* ─── Right: Tab Content ─── */}
          <div className="md:flex-1 min-w-0">

            {/* ── Tab 1: Overview ── */}
            <TabsContent value="overview" className="mt-0 space-y-6">
              {/* Perks */}
              {perks.length > 0 && (
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50
              hover:shadow-md transition-all duration-200">
                  <h3 className="text-label-sm text-muted-foreground mb-4 font-semibold uppercase tracking-wider">
                    {t('plantDetail.perks')}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {perks.map((p) => (
                      <div key={p.label} className="flex items-center gap-2 py-2 px-4 rounded-xl bg-primary/5 border border-primary/10 text-primary hover:bg-primary/10 transition-colors">
                        <span className="text-lg">{p.icon}</span> 
                        <span className="text-body-md font-semibold">{p.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety */}
              <div className="bg-card rounded-xl p-5 shadow-sm border border-border/50
            hover:shadow-md transition-all duration-200">
                <h3 className="text-label-sm text-muted-foreground mb-3 font-semibold uppercase tracking-wider">
                  {t('plantDetail.safety')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Pets */}
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedPlant.is_toxic_to_pets ? (
                      <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                    )}
                    <div>
                      <p className="text-label-sm text-muted-foreground">{t('plantDetail.pets')}</p>
                      <p className={`text-body-md font-medium ${selectedPlant.is_toxic_to_pets ? 'text-destructive' : 'text-emerald-600'}`}>
                        {selectedPlant.is_toxic_to_pets ? t('plantDetail.toxicToPets') : t('plantDetail.safeForPets')}
                      </p>
                    </div>
                  </div>
                  {/* Humans */}
                  <div className="flex items-center gap-3 min-w-0">
                    {bd?.poisonous_to_humans === true ? (
                      <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
                    ) : bd?.poisonous_to_humans === false ? (
                      <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                    ) : (
                      <ShieldQuestion className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div>
                      <p className="text-label-sm text-muted-foreground">{t('plantDetail.humans')}</p>
                      <p className={`text-body-md font-medium ${bd?.poisonous_to_humans === true ? 'text-destructive'
                          : bd?.poisonous_to_humans === false ? 'text-emerald-600'
                            : 'text-muted-foreground'
                        }`}>
                        {bd?.poisonous_to_humans === true ? t('plantDetail.toxicToHumans')
                          : bd?.poisonous_to_humans === false ? t('plantDetail.safeForHumans')
                            : t('plantDetail.safetyUnknown')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {bd?.description && (
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50
              hover:shadow-md transition-all duration-200">
                  <h3 className="text-label-sm text-muted-foreground mb-3 font-semibold uppercase tracking-wider">
                    {t('plantDetail.description')}
                  </h3>
                  <p className="text-[15px] text-foreground leading-relaxed font-medium">{translateBotanical(bd.description, t)}</p>
                </div>
              )}

              {/* Botanical info */}
              {(bd?.family || bd?.origin?.length || bd?.type) && (
                <div className="bg-card rounded-xl p-5 shadow-sm border border-border/50
              hover:shadow-md transition-all duration-200">
                  <div className="flex flex-wrap justify-around gap-6 text-center min-w-0">
                    {bd?.family && (
                      <div>
                        <p className="text-label-sm text-muted-foreground mb-1">{t('plantDetail.family')}</p>
                        <p className="text-body-md font-medium text-foreground">{bd.family}</p>
                      </div>
                    )}
                    {bd?.origin && bd.origin.length > 0 && (
                      <div>
                        <p className="text-label-sm text-muted-foreground mb-1">{t('plantDetail.origin')}</p>
                        <p className="text-body-md font-medium text-foreground">{bd.origin.map(o => translateBotanical(o, t)).join(', ')}</p>
                      </div>
                    )}
                    {bd?.type && (
                      <div>
                        <p className="text-label-sm text-muted-foreground mb-1">{t('plantDetail.type')}</p>
                        <p className="text-body-md font-medium text-foreground">{translateBotanical(bd.type, t)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Tab 2: Care ── */}
            <TabsContent value="care" className="mt-0">
              <div className="grid grid-cols-1 gap-4">
                {/* Watering */}
                <CareCard icon={<Droplets className="h-5 w-5 text-blue-600" />}
                  iconBg="bg-blue-100"
                  label={t('plantDetail.wateringSchedule')}>
                  <p className="text-body-md font-medium text-foreground">
                    {translateBotanical(selectedPlant.watering_guide || '—', t)}
                  </p>
                  {bd?.watering_benchmark?.value && (
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      {t('plantDetail.everyNDays', { days: bd.watering_benchmark.value })}
                    </p>
                  )}
                  {selectedPlant.next_water_date && (
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      {t('plantDetail.nextWater', 'Next: ')} {new Date(selectedPlant.next_water_date).toLocaleDateString()}
                    </p>
                  )}
                </CareCard>

                {/* Sunlight */}
                <CareCard icon={<Sun className="h-5 w-5 text-amber-500" />}
                  iconBg="bg-amber-100" label={t('plant.light')}>
                  <p className="text-body-md font-medium text-foreground">
                    {translateBotanical(selectedPlant.sunlight_requirement || '—', t)}
                  </p>
                </CareCard>

                {/* Soil */}
                {bd?.soil && bd.soil.length > 0 && (
                  <CareCard icon={<Sprout className="h-5 w-5 text-amber-700" />}
                    iconBg="bg-amber-100" label={t('plantDetail.soilType')}>
                    <p className="text-body-md font-medium text-foreground">
                      {bd.soil.map(s => translateBotanical(s, t)).join(', ')}
                    </p>
                  </CareCard>
                )}

                {/* Pruning */}
                {bd?.pruning_month && bd.pruning_month.length > 0 && (
                  <CareCard icon={<Scissors className="h-5 w-5 text-violet-600" />}
                    iconBg="bg-violet-100" label={t('plantDetail.pruning')}>
                    <p className="text-body-md font-medium text-foreground">
                      {bd.pruning_month.map(m => translateBotanical(m, t)).join(', ')}
                    </p>
                  </CareCard>
                )}

                {/* Propagation */}
                {bd?.propagation && bd.propagation.length > 0 && (
                  <CareCard icon={<Sprout className="h-5 w-5 text-emerald-600" />}
                    iconBg="bg-emerald-100" label={t('plantDetail.propagation')}>
                    <p className="text-body-md font-medium text-foreground">
                      {bd.propagation.map(p => translateBotanical(p, t)).join(', ')}
                    </p>
                  </CareCard>
                )}

                {/* Pest susceptibility */}
                {bd?.pest_susceptibility && bd.pest_susceptibility.length > 0 && (
                  <CareCard icon={<Bug className="h-5 w-5 text-orange-600" />}
                    iconBg="bg-orange-100" label={t('plantDetail.pests')}>
                    <div className="flex flex-wrap gap-1.5">
                      {bd.pest_susceptibility.map((p) => (
                        <Badge key={p} variant="outline" className="text-[12px] py-0.5 text-orange-600 border-orange-200 bg-orange-50">
                          {translateBotanical(p, t)}
                        </Badge>
                      ))}
                    </div>
                  </CareCard>
                )}

                {/* Flowering Season */}
                {bd?.flowers && bd?.flowering_season && (
                  <CareCard icon={<Flower2 className="h-5 w-5 text-pink-600" />}
                    iconBg="bg-pink-100" label={t('plantDetail.floweringSeason')}>
                    <p className="text-body-md font-medium text-foreground">
                      {bd.flowering_season}
                    </p>
                  </CareCard>
                )}

                {/* Hardiness / Temperature Zones */}
                {bd?.hardiness && bd.hardiness.min && bd.hardiness.max && (
                  <CareCard icon={<Thermometer className="h-5 w-5 text-red-600" />}
                    iconBg="bg-red-100" label={t('plantDetail.hardiness')}>
                    <p className="text-body-md font-medium text-foreground">
                      {t('plantDetail.hardinessZones', { min: bd.hardiness.min, max: bd.hardiness.max })}
                    </p>
                  </CareCard>
                )}

                {/* Dimensions */}
                {bd?.dimensions && bd.dimensions.length > 0 && (
                  <CareCard icon={<Ruler className="h-5 w-5 text-sky-600" />}
                    iconBg="bg-sky-100" label={t('plantDetail.dimensions')}>
                    <p className="text-body-md font-medium text-foreground">
                      {bd.dimensions.map(d =>
                        `${d.min_value}–${d.max_value} ${d.unit}`
                      ).join(', ')}
                    </p>
                  </CareCard>
                )}

                {/* Sparse data prompt — only show when botanical_data is truly empty/null,
                   not just missing a few sub-fields. Plants with partial data from
                   Perenual/LLM still have useful info to display. */}
                {(!bd || Object.keys(bd).length === 0) && (
                  <div className="bg-accent/20 rounded-xl p-5 border border-dashed border-border text-center">
                    <Sprout className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-body-md text-muted-foreground mb-3">
                      {t('plantDetail.sparseDataHint')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full gap-1.5"
                      onClick={async () => {
                        if (!selectedPlant || refreshing) return;
                        setRefreshing(true);
                        try {
                          await plantApi.refreshBotanical(selectedPlant.id);
                          await fetchPlant(selectedPlant.id);
                          toast.success(t('plantDetail.refreshSuccess'));
                        } catch {
                          toast.error(t('plantDetail.refreshError'));
                        } finally {
                          setRefreshing(false);
                        }
                      }}
                      disabled={refreshing}
                    >
                      {refreshing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      {t('plantDetail.refreshBotanical')}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Tab 3: Explore ── */}
            <TabsContent value="explore" className="mt-0 space-y-6">
              {exploreLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                </div>
              ) : exploreData ? (
                <>
                  {/* Fun Fact */}
                  <div className="bg-gradient-to-br from-accent/40 via-card to-secondary/10
                rounded-xl p-6 shadow-sm border border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      <h3 className="font-headline text-lg text-primary font-semibold">
                        {t('plantDetail.funFact')}
                      </h3>
                    </div>
                    <p className="text-body-md text-foreground leading-relaxed">
                      {exploreData.fun_fact}
                    </p>
                  </div>

                  {/* FAQs */}
                  {exploreData.faqs.length > 0 && (
                    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
                      <div className="flex items-center gap-2 mb-4">
                        <HelpCircle className="h-5 w-5 text-primary" />
                        <h3 className="font-headline text-lg text-primary font-semibold">
                          {t('plantDetail.commonQuestions')}
                        </h3>
                      </div>
                      <Accordion type="single" collapsible className="w-full">
                        {exploreData.faqs.map((faq, i) => (
                          <AccordionItem key={i} value={`faq-${i}`}>
                            <AccordionTrigger className="text-body-md text-left font-medium">
                              {faq.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-body-md text-muted-foreground">
                              {faq.a}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-body-md text-muted-foreground">
                    {t('plantDetail.loadingExplore')}
                  </p>
                </div>
              )}
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* ─── Always-visible: Care History ─── */}
      <div className="bg-card rounded-xl p-6 md:p-8 shadow-sm border border-border/50">
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-headline text-[24px] text-primary">{t('plant.careHistory')}</h2>
        </div>

        {historyLoading ? (
          <p className="text-body-md text-muted-foreground">Loading history...</p>
        ) : careHistory.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-body-md text-muted-foreground">
              No care actions recorded yet. Complete a daily task to start tracking!
            </p>
          </div>
        ) : (
          <div className="relative pl-4 border-l-2 border-border space-y-8">
            {careHistory.slice(0, 10).map((entry, i) => (
              <div key={entry.id} className="relative">
                <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full
                  ring-4 ring-card ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                />
                <div className="flex flex-col md:flex-row gap-2 md:gap-8">
                  <div className="md:w-32 shrink-0 pt-0.5">
                    <p className="text-label-sm text-muted-foreground">
                      {new Date(entry.action_date).toLocaleDateString(
                        i18n.language === 'vi' ? 'vi-VN' : 'en-US',
                        { month: 'short', day: 'numeric', year: 'numeric' }
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-body-lg text-primary font-medium mb-0.5 capitalize">
                      {entry.action_type}
                    </p>
                    {entry.notes && (
                      <p className="text-body-md text-muted-foreground">{entry.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Always-visible: Disease History ─── */}
      <div className="bg-card rounded-xl p-6 md:p-8 shadow-sm border border-border/50">
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-headline text-[24px] text-primary">{t('plant.diseaseHistory')}</h2>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-1"
            onClick={() => setHealthCheckOpen(true)}
          >
            <Activity className="h-3.5 w-3.5" />
            {t('plant.newScan')}
          </Button>
        </div>

        {diseaseLoading && diseaseLogs.length === 0 ? (
          <p className="text-body-md text-muted-foreground">Loading scans...</p>
        ) : diseaseLogs.length === 0 && !pendingDiseaseLogs[selectedPlant.id] ? (
          <div className="text-center py-8">
            <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-body-md text-muted-foreground">
              No health checks yet. Tap "Health Check" to scan for diseases.
            </p>
          </div>
        ) : (
          <div className="relative pl-4 border-l-2 border-border space-y-8">
            {pendingDiseaseLogs[selectedPlant.id] && (
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-muted-foreground/30 animate-pulse ring-4 ring-card" />
                <div className="flex flex-col md:flex-row gap-2 md:gap-8 animate-pulse">
                  <div className="md:w-32 shrink-0 pt-0.5">
                    <Skeleton className="h-4 w-20 bg-muted" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-muted" />
                      <Skeleton className="h-5 w-40 bg-muted" />
                    </div>
                    <Skeleton className="h-4 w-28 bg-muted" />
                  </div>
                </div>
              </div>
            )}
            {diseaseLogs.slice(0, 10).map((log, i) => (
              <DiseaseLogCard
                key={log.id}
                log={log}
                isLatest={i === 0 && !pendingDiseaseLogs[selectedPlant.id]}
                onResolved={handleDiseaseResolved}
              />
            ))}
          </div>
        )}
      </div>

      <HealthCheckDialog
        open={healthCheckOpen}
        onOpenChange={setHealthCheckOpen}
        plantId={selectedPlant.id}
        plantName={selectedPlant.name}
        onScanComplete={() => {
          fetchDiseaseLogs();
          // Re-fetch plant data too — disease scan may have changed care schedule
          if (selectedPlant?.id) fetchPlant(selectedPlant.id);
        }}
      />

      {/* ─── Delete Confirmation Dialog ─── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {t('plantDetail.deleteTitle')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t('plantDetail.deleteDescription', { name: selectedPlant.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t('plantDetail.deleteCancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              {t('plantDetail.deleteConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Reusable care metric card with hover lift and themed icon */
function CareCard({ icon, label, children, iconBg }: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  iconBg?: string;
}) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border/50
      hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full ${iconBg || 'bg-accent/40'} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-label-sm text-muted-foreground mb-0.5">{label}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
