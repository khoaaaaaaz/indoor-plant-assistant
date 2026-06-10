// src/pages/Dashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Leaf, Camera, Droplets, Plus, TrendingUp, Bell, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CuteYellowFlowerPlant } from '@/components/icons/cute-plants';
import { usePlantStore } from '@/store/plantStore';
import { useTaskStore } from '@/store/taskStore';
import { PlantCard } from '@/components/plants/PlantCard';
import { CareTaskItem } from '@/components/care/CareTaskItem';
import { ScanDialog } from '@/components/scan/ScanDialog';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/react';
import { notificationService } from '@/services/notificationService';
import { useNotificationStore } from '@/store/notificationStore';
// AUTH PATTERN: Always use `isSignedIn` (not `isLoaded`) in useEffect guards
// that call authenticated API endpoints. `isLoaded` only means "Clerk JS has
// initialized" — the session token may not be ready yet, causing 401 errors.

export default function Dashboard() {
  const { plants: rawPlants, loading, fetchPlants } = usePlantStore();
  const plants = Array.isArray(rawPlants) ? rawPlants : [];
  const { tasks, deriveTasks, fetchTodayCompletions, completeTask } = useTaskStore();
  const { addNotification, clearNotification } = useNotificationStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [scanOpen, setScanOpen] = useState(searchParams.get('scan') === 'true');
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (searchParams.get('scan') === 'true') {
      setScanOpen(true);
    }
  }, [searchParams]);

  const handleScanOpenChange = (open: boolean) => {
    setScanOpen(open);
    if (!open && searchParams.get('scan') === 'true') {
      setSearchParams({});
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchPlants();
    }
  }, [isSignedIn, fetchPlants]);
  useEffect(() => {
    if (plants.length > 0) {
      deriveTasks(plants);
      fetchTodayCompletions(plants);
    }
  }, [plants, deriveTasks, fetchTodayCompletions]);

  const dailyTasks = useMemo(() => tasks.filter((t) => t.isOverdue), [tasks]);
  const pendingTasks = useMemo(() => dailyTasks.filter((t) => !t.isCompleted), [dailyTasks]);

  // ─── Native Web Notifications ───
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    notificationService.getPermissionState()
  );
  const [showNotificationBanner, setShowNotificationBanner] = useState<boolean>(
    notificationService.isSupported() &&
    notificationService.getPermissionState() === 'default' &&
    !localStorage.getItem('fm_hide_notification_banner')
  );

  const pendingTasksCount = pendingTasks.length;

  useEffect(() => {
    if (pendingTasksCount > 0) {
      addNotification({
        type: 'care',
        titleVi: t('dashboard.careTaskTitle', { lng: 'vi' }),
        titleEn: t('dashboard.careTaskTitle', { lng: 'en' }),
        descVi: t('dashboard.careTaskDesc', { count: pendingTasksCount, lng: 'vi' }),
        descEn: t('dashboard.careTaskDesc', { count: pendingTasksCount, lng: 'en' }),
      });

      if (notificationPermission === 'granted') {
        notificationService.sendDailyCareReminder(pendingTasksCount);
      }
    } else {
      // Clear care notification if all tasks are finished!
      const careNoti = useNotificationStore.getState().notifications.find((n) => n.type === 'care');
      if (careNoti) {
        clearNotification(careNoti.id);
      }
    }
  }, [pendingTasksCount, notificationPermission, addNotification, clearNotification]);

  const handleEnableNotifications = async () => {
    setShowNotificationBanner(false);
    const newPermission = await notificationService.requestPermission();
    setNotificationPermission(newPermission);
  };

  const handleDismissBanner = () => {
    localStorage.setItem('fm_hide_notification_banner', 'true');
    setShowNotificationBanner(false);
  };

  // ─── Ecosystem Vitality Score (0-100%) ───
  // Real calculation based on actual plant health:
  //   - Watering: each plant with overdue watering loses points
  //   - Disease: each plant with an active (unresolved) disease loses points
  //   - 100% = all watered on time + zero active diseases
  // Wrapped in useMemo: only recalculates when `plants` array reference changes.
  const vitalityScore = useMemo(() => {
    if (plants.length === 0) return 0;

    let totalScore = 0;

    plants.forEach((plant) => {
      let plantScore = 100;

      // Watering check (50% weight): lose up to 50 points for overdue
      if (plant.next_water_date) {
        const due = new Date(plant.next_water_date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysOverdue = Math.floor(
          (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysOverdue > 0) {
          // Lose 10 points per day overdue, capped at 50
          plantScore -= Math.min(daysOverdue * 10, 50);
        }
      }

      // Disease check (50% weight): active disease = -40 points
      if (plant.has_active_disease) {
        plantScore -= 40;
      }

      plantScore = Math.max(0, plantScore);
      totalScore += plantScore;
    });

    return Math.round(totalScore / plants.length);
  }, [plants]);

  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-section-gap">
      {/* ─── Greeting ─── */}
      <section>
        <h1 className="font-headline text-headline-xl text-primary mb-2">
          {t('dashboard.greeting')}
        </h1>
        <p className="text-body-lg text-muted-foreground max-w-2xl">
          {t('dashboard.subtitle')}
        </p>
      </section>

      {/* ─── Notification Permission Banner ─── */}
      {showNotificationBanner && (
        <div className="bg-emerald-50/50 backdrop-blur-md dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-headline text-lg text-primary font-semibold mb-1">
                {t('notifications.enableTitle', 'Enable Care Reminders')}
              </h4>
              <p className="text-body-md text-sm text-muted-foreground max-w-xl">
                {t('notifications.enableDesc', 'Never forget to water or mist! Enable native browser notifications to receive smart watering reminders and weather alerts directly on your device.')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              onClick={handleEnableNotifications}
              className="flex-1 md:flex-initial bg-primary text-primary-foreground hover:bg-primary/95 text-label-sm font-semibold py-2.5 px-5 rounded-full shadow-sm transition-all"
            >
              {t('notifications.enableButton', 'Enable Reminders')}
            </button>
            <button
              onClick={handleDismissBanner}
              className="p-2.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Stat Cards (Bento Grid) ─── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weather Widget */}
        <div className="col-span-1">
          <WeatherWidget />
        </div>

        {/* Ecosystem Vitality — spans 1 col on desktop */}
        <div className="col-span-1 bg-card rounded-3xl p-6 shadow-sm
          border border-border/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent rounded-full
            blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none" />
          <div className="flex justify-between items-start z-10 relative">
            <div>
              <p className="text-label-sm text-muted-foreground uppercase tracking-wider mb-1">
                {t('dashboard.vitality')}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-[56px] leading-none text-primary font-semibold">
                  {plants.length > 0 ? vitalityScore : '—'}%
                </span>
                {plants.length > 0 && vitalityScore >= 80 && (
                  <TrendingUp className="h-6 w-6 text-secondary" />
                )}
              </div>
            </div>
            {plants.length > 0 && (
              <Badge
                variant={vitalityScore >= 80 ? 'secondary' : 'outline'}
                className={`gap-1 ${vitalityScore < 50 ? 'border-destructive text-destructive' : ''}`}
              >
                <Leaf className="h-3 w-3" />
                {vitalityScore >= 80
                  ? t('dashboard.thriving')
                  : vitalityScore >= 50
                    ? t('dashboard.needsAttention', 'Needs Attention')
                    : t('dashboard.critical', 'Critical')}
              </Badge>
            )}
          </div>
          <p className="text-body-md text-muted-foreground mt-6 relative z-10">
            {plants.length === 0
              ? t('dashboard.addFirst')
              : `${plants.length} ${t('common.plants')}`}
          </p>
        </div>

        {/* Watering action card */}
        <div className="bg-primary text-primary-foreground rounded-3xl p-6 shadow-sm
          relative overflow-hidden group cursor-pointer hover:shadow-md transition-shadow">
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-white rounded-full
            blur-2xl opacity-10 translate-y-1/2 translate-x-1/4" />
          <Droplets className="h-8 w-8 opacity-80 mb-6" />
          <h3 className="font-headline text-headline-lg-mobile font-medium">
            {pendingTasks.length} {t('common.plants')}
          </h3>
          <p className="text-body-md opacity-80">{t('dashboard.needCare')}</p>
        </div>
      </section>

      {/* ─── Plant Collection (Horizontal Scroll) ─── */}
      <section className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="font-headline text-headline-lg-mobile md:text-headline-lg text-primary">
            {t('dashboard.collection')}
          </h2>
        </div>

        {loading ? (
          <div className="flex gap-6 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="min-w-[260px] max-w-[260px] rounded-xl border border-border/50 overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="pt-3 border-t border-border/50">
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>

        ) : plants.length === 0 ? (
          /* Empty state */
          <div className="bg-card border-2 border-dashed border-border rounded-xl p-12
            flex flex-col items-center justify-center text-center">
            <CuteYellowFlowerPlant size={96} className="mb-4 opacity-80" />
            <h3 className="font-headline text-xl text-primary font-medium mb-2">
              {t('dashboard.noPlants')}
            </h3>
            <p className="text-body-md text-muted-foreground mb-6 max-w-sm">
              {t('dashboard.scanFirst')}
            </p>
            <button
              onClick={() => setScanOpen(true)}
              className="bg-primary text-primary-foreground rounded-full py-3 px-6
                text-label-sm font-semibold flex items-center gap-2 shadow-sm
                hover:shadow-md hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              <Camera className="h-4 w-4" />
              {t('dashboard.scanFirst')}
            </button>
          </div>
        ) : (
          /* Horizontal scroll cards */
          <div className="flex overflow-x-auto gap-6 snap-x snap-mandatory
            hide-scrollbar -mx-5 px-5 lg:-mx-12 lg:px-12 pb-4">
            {plants.map((plant) => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
            {/* Add new plant card */}
            <div
              onClick={() => setScanOpen(true)}
              className="min-w-[260px] max-w-[260px] snap-center bg-muted border-2
                border-dashed border-border rounded-xl flex flex-col items-center
                justify-center text-muted-foreground hover:bg-muted/80
                transition-colors cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-card flex items-center
                justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <span className="text-label-sm font-semibold text-primary">{t('dashboard.addNewPlant')}</span>
            </div>
          </div>
        )}
      </section>

      {/* ─── Daily Care Tasks ─── */}
      {dailyTasks.length > 0 && (
        <section className="flex flex-col gap-4 max-w-3xl">
          <h2 className="font-headline text-headline-lg-mobile md:text-headline-lg text-primary">
            {t('dashboard.dailyCareTasks')}
          </h2>
          <div className="flex flex-col gap-3">
            {dailyTasks.map((task) => (
              <CareTaskItem
                key={task.id}
                task={task}
                onComplete={completeTask}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── Scan Dialog ─── */}
      <ScanDialog open={scanOpen} onOpenChange={handleScanOpenChange} />
    </div>
  );
}
