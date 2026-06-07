// src/pages/CareSchedule.tsx
//
// Plant Care Calendar page.
// Full monthly calendar with view toggle (monthly / weekly),
// day detail panel, care legend, and quick stats.

import { useEffect } from 'react';
import { usePlantStore } from '@/store/plantStore';
import { useTaskStore } from '@/store/taskStore';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/react';
import { PlantCareCalendar } from '@/components/care/PlantCareCalendar';

export default function CareSchedule() {
  const { plants, fetchPlants } = usePlantStore();
  const { tasks, deriveTasks, fetchTodayCompletions, completeTask } = useTaskStore();
  const { isSignedIn } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (isSignedIn) fetchPlants();
  }, [isSignedIn, fetchPlants]);

  useEffect(() => {
    if (plants.length > 0) {
      deriveTasks(plants);
      fetchTodayCompletions(plants);
    }
  }, [plants, deriveTasks, fetchTodayCompletions]);

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header ── */}
      <section>
        <h1 className="font-headline text-headline-xl text-primary tracking-tight mb-2">
          {t('care.schedule')}
        </h1>
        <p className="text-body-md text-muted-foreground max-w-2xl">
          {t('care.subtitle')}
        </p>
      </section>

      {/* ── Calendar ── */}
      <PlantCareCalendar tasks={tasks} onComplete={completeTask} />
    </div>
  );
}
