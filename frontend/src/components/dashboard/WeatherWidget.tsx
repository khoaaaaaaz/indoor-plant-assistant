// src/components/dashboard/WeatherWidget.tsx
//
// Weather widget styled like a native weather app card.
// Follows Botanical Minimalism design system (DESIGN.md).
// Provides actionable plant care advice based on conditions.
// Triggers smart notifications to defer watering when weather is wet.

import { useEffect, useState } from 'react';
import {
  Cloud, Sun, Droplets, MapPin, Loader2,
  Sprout, ThermometerSun, CloudRain, CloudOff,
} from 'lucide-react';
import { weatherApi, plantApi } from '@/services/api';
import { usePlantStore } from '@/store/plantStore';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { notificationService } from '@/services/notificationService';
import { useNotificationStore } from '@/store/notificationStore';

interface WeatherData {
  temperature: number;
  humidity: number;
  soil_moisture: number;
  timestamp: string;
  location: string;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deferSent, setDeferSent] = useState(false);
  const { plants, fetchPlants } = usePlantStore();
  const { addNotification } = useNotificationStore();
  const { t } = useTranslation();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await weatherApi.getCurrent(
              position.coords.latitude,
              position.coords.longitude
            );
            setWeather(res.data);
          } catch {
            console.error('Weather fetch failed');
          } finally {
            setLoading(false);
          }
        },
        () => {
          // Fallback: Hanoi, VN
          weatherApi
            .getCurrent(21.0285, 105.8542)
            .then((res) => setWeather(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
        }
      );
    } else {
      setLoading(false);
    }
  }, []);

  // ─── Smart Notification: suggest skipping watering ───
  useEffect(() => {
    if (!weather || deferSent || plants.length === 0) return;

    const isWet = weather.humidity > 75 || weather.soil_moisture > 60;
    const today = new Date().toISOString().split('T')[0];
    const plantsDueToday = plants.filter(
      (p) => p.next_water_date && p.next_water_date <= today
    );

    if (isWet && plantsDueToday.length > 0) {
      setDeferSent(true); // only show once per session

      // Trigger in-app notification
      addNotification({
        type: 'weather',
        titleVi: t('weather.smartTitle', { lng: 'vi' }),
        titleEn: t('weather.smartTitle', { lng: 'en' }),
        descVi: t('weather.smartDesc', { count: plantsDueToday.length, lng: 'vi' }),
        descEn: t('weather.smartDesc', { count: plantsDueToday.length, lng: 'en' }),
      });

      // Trigger PWA Native Browser Notification
      notificationService.sendSmartWeatherAlert(plantsDueToday.length);

      toast(t('weather.deferTitle'), {
        description: t('weather.deferDescription', {
          count: plantsDueToday.length,
        }),
        duration: 15000,
        action: {
          label: t('weather.deferAction'),
          onClick: async () => {
            try {
              const res = await plantApi.deferWatering();
              const count = res.data.updated_count;
              toast.success(
                t('weather.deferSuccess', { count })
              );
              // Refresh plants to reflect the new dates
              fetchPlants();
            } catch {
              toast.error(t('weather.deferError'));
            }
          },
        },
      });
    }
  }, [weather, plants, deferSent, t, fetchPlants, addNotification]);

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="bg-card rounded-3xl p-6 shadow-sm border border-border/50
        h-full flex flex-col items-center justify-center min-h-[220px]">
        <Loader2 className="h-7 w-7 animate-spin text-primary/40 mb-2" />
        <p className="text-label-sm text-muted-foreground">
          {t('weather.loading')}
        </p>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="bg-card rounded-3xl p-6 shadow-sm border border-border/50
        h-full flex flex-col items-center justify-center min-h-[220px]">
        <CloudOff className="h-7 w-7 text-muted-foreground/40 mb-2" />
        <p className="text-label-sm text-muted-foreground">
          {t('weather.error')}
        </p>
      </div>
    );
  }

  // ─── Derive plant care advice from conditions ───
  const isHot = weather.temperature > 30;
  const isCold = weather.temperature < 15;
  const isHumid = weather.humidity > 75;
  const isDry = weather.humidity < 35;

  let adviceKey = 'weather.normalAdvice';
  let AdviceIcon = Sprout;
  if (isHot) { adviceKey = 'weather.hotAdvice'; AdviceIcon = ThermometerSun; }
  else if (isCold) { adviceKey = 'weather.coldAdvice'; AdviceIcon = Cloud; }
  else if (isHumid) { adviceKey = 'weather.humidAdvice'; AdviceIcon = CloudRain; }
  else if (isDry) { adviceKey = 'weather.dryAdvice'; AdviceIcon = Droplets; }

  // Pick weather icon based on temperature
  const WeatherIcon = weather.temperature >= 26 ? Sun : Cloud;

  return (
    <div className="bg-card rounded-3xl shadow-sm border border-border/50
      overflow-hidden h-full flex flex-col">

      {/* ── Top: Temperature Hero ── */}
      <div className="relative px-6 pt-6 pb-4">
        {/* Decorative background blob */}
        <div className="absolute top-0 right-0 w-28 h-28 bg-accent/40
          rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />

        <div className="flex items-center gap-1.5 text-label-sm text-muted-foreground
          uppercase tracking-wider mb-3 relative z-10">
          <MapPin className="h-3.5 w-3.5" />
          <span>{t('weather.title')}</span>
        </div>

        <div className="flex items-end justify-between relative z-10">
          <div className="flex items-baseline gap-1">
            <span className="font-headline text-[48px] leading-none text-primary font-semibold">
              {Math.round(weather.temperature)}
            </span>
            <span className="font-headline text-xl text-primary/60 font-medium">°C</span>
          </div>
          <WeatherIcon className="h-10 w-10 text-secondary opacity-70" />
        </div>
      </div>

      {/* ── Middle: Stats Row ── */}
      <div className="grid grid-cols-2 gap-px bg-border/50 mx-4">
        <div className="bg-card py-3 pr-3 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider">
            <Droplets className="h-3 w-3 text-secondary" />
            {t('weather.humidity')}
          </div>
          <span className="text-body-md font-semibold text-foreground">
            {weather.humidity}%
          </span>
        </div>
        <div className="bg-card py-3 pl-3 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider">
            <Sprout className="h-3 w-3 text-secondary" />
            {t('weather.soilMoisture')}
          </div>
          <span className="text-body-md font-semibold text-foreground">
            {typeof weather.soil_moisture === 'number'
              ? `${weather.soil_moisture.toFixed(1)}%`
              : '—'}
          </span>
        </div>
      </div>

      {/* ── Bottom: Plant Care Advice ── */}
      <div className="mt-auto mx-4 mb-4 mt-3 rounded-2xl bg-accent/20 px-4 py-3
        flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center
          justify-center shrink-0 mt-0.5">
          <AdviceIcon className="h-4 w-4 text-secondary" />
        </div>
        <p className="text-[13px] leading-[18px] text-primary/80">
          {t(adviceKey)}
        </p>
      </div>
    </div>
  );
}
