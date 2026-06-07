// src/components/care/PlantCareCalendar.tsx
//
// Full monthly calendar grid for plant care scheduling.
// Adapted from reference design, styled with Botanical Minimalism tokens.
// Supports month navigation, today highlight, selected-day detail panel,
// and view toggle (monthly / weekly).

import { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Droplets, Sparkles, Leaf, Check,
  Sun, Sunset, CalendarDays, LayoutList, Lock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DerivedCareTask } from '@/store/taskStore';
import { CuteMonsteraPlant } from '@/components/icons/cute-plants';

// ─── Types ───
type CareType = 'water' | 'mist' | 'fertilize' | 'rotate';
type ViewMode = 'monthly' | 'weekly';

const careConfig: Record<CareType, {
  icon: typeof Droplets;
  colorDot: string;
  colorBadge: string;
}> = {
  water: {
    icon: Droplets,
    colorDot: 'bg-blue-400',
    colorBadge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  mist: {
    icon: Sparkles,
    colorDot: 'bg-cyan-400',
    colorBadge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  fertilize: {
    icon: Leaf,
    colorDot: 'bg-emerald-400',
    colorBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  rotate: {
    icon: Leaf,
    colorDot: 'bg-amber-400',
    colorBadge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

interface Props {
  tasks: DerivedCareTask[];
  onComplete: (taskId: string) => Promise<void>;
}

export function PlantCareCalendar({ tasks, onComplete }: Props) {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  // ─── Calendar math ───
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  // Shift to Monday start: Mon=0, Tue=1, ..., Sun=6
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptySlots = Array.from({ length: startOffset }, (_, i) => i);

  // Week view: get 7 days centered around selected day
  const weekDays = useMemo(() => {
    const result: Date[] = [];
    const center = new Date(selectedDay);
    const dayOfWeek = center.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(center);
    monday.setDate(center.getDate() + mondayOffset);
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      result.push(d);
    }
    return result;
  }, [selectedDay]);

  // ─── Map tasks to dates ───
  const tasksByDate = useMemo(() => {
    const map: Record<string, DerivedCareTask[]> = {};
    tasks.forEach((task) => {
      const key = task.dueDate; // ISO date string YYYY-MM-DD
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [tasks]);

  // Get date key from day number in current month
  const dateKey = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const dateKeyFromDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // ─── Selected day tasks ───
  const selectedDateKey = dateKeyFromDate(selectedDay);
  const selectedTasks = tasksByDate[selectedDateKey] || [];
  const morningTasks = selectedTasks.filter(t => t.actionType === 'water' || t.actionType === 'mist');
  const afternoonTasks = selectedTasks.filter(t => t.actionType !== 'water' && t.actionType !== 'mist');

  // ─── Navigation ───
  const handlePrev = () => {
    if (viewMode === 'monthly') {
      setCurrentDate(new Date(year, month - 1));
    } else {
      const d = new Date(selectedDay);
      d.setDate(d.getDate() - 7);
      setSelectedDay(d);
      setCurrentDate(new Date(d));
    }
  };
  
  const handleNext = () => {
    if (viewMode === 'monthly') {
      setCurrentDate(new Date(year, month + 1));
    } else {
      const d = new Date(selectedDay);
      d.setDate(d.getDate() + 7);
      setSelectedDay(d);
      setCurrentDate(new Date(d));
    }
  };
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDay(new Date()); };

  // ─── Day names (localized) ───
  const dayNames = [
    t('care.days.mon'), t('care.days.tue'), t('care.days.wed'),
    t('care.days.thu'), t('care.days.fri'), t('care.days.sat'), t('care.days.sun'),
  ];
  const monthName = t(`care.months.${month}`);

  // ─── Quick stats ───
  const monthTasks = days.flatMap(d => tasksByDate[dateKey(d)] || []);
  const waterCount = monthTasks.filter(t => t.actionType === 'water').length;
  const mistCount = monthTasks.filter(t => t.actionType === 'mist').length;
  const fertilizeCount = monthTasks.filter(t => t.actionType === 'fertilize').length;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Calendar Card ── */}
      <div className="bg-card rounded-3xl border border-border/50 shadow-sm p-5 sm:p-8">

        {/* Month header + view toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button onClick={handlePrev}
              className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <h2 className="font-headline text-2xl sm:text-3xl font-medium text-primary min-w-[200px] text-center">
              {monthName} {year}
            </h2>
            <button onClick={handleNext}
              className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={goToToday}
              className="text-label-sm text-primary font-semibold px-3 py-1.5 rounded-full
                hover:bg-accent/20 transition-colors hidden sm:block">
              {t('care.today')}
            </button>
            <div className="flex bg-muted p-0.5 rounded-full">
              <button onClick={() => {
                setViewMode('monthly');
                setCurrentDate(new Date(selectedDay));
              }}
                className={`p-2 rounded-full transition-colors ${
                  viewMode === 'monthly' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'
                }`}>
                <CalendarDays className="h-4 w-4" />
              </button>
              <button onClick={() => {
                setViewMode('weekly');
                setCurrentDate(new Date(selectedDay));
              }}
                className={`p-2 rounded-full transition-colors ${
                  viewMode === 'weekly' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'
                }`}>
                <LayoutList className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {dayNames.map(name => (
            <div key={name}
              className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2">
              {name}
            </div>
          ))}
        </div>

        {/* ── Monthly view ── */}
        {viewMode === 'monthly' && (
          <div className="grid grid-cols-7 gap-1.5">
            {emptySlots.map(i => <div key={`e-${i}`} className="aspect-square" />)}

            {days.map(day => {
              const d = new Date(year, month, day);
              const key = dateKey(day);
              const dayTasks = tasksByDate[key] || [];
              const isT = isSameDay(d, today);
              const isSel = isSameDay(d, selectedDay);
              const hasOverdue = dayTasks.some(t => t.isOverdue && !t.isCompleted);

              return (
                <button key={day} onClick={() => setSelectedDay(d)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center
                    gap-1 transition-all relative group border-2
                    ${isSel
                      ? 'border-primary bg-accent/30 shadow-sm'
                      : isT
                        ? 'border-accent bg-accent/10'
                        : 'border-transparent hover:bg-muted/50 hover:border-border/50'
                    }`}
                >
                  <span className={`text-sm font-semibold leading-none
                    ${isSel ? 'text-primary' : isT ? 'text-primary' : 'text-foreground'}
                  `}>
                    {day}
                  </span>

                  {/* Care type dots */}
                  {dayTasks.length > 0 && (
                    <div className="flex gap-0.5">
                      {[...new Set(dayTasks.map(t => t.actionType))].map(type => (
                        <span key={type}
                          className={`w-1.5 h-1.5 rounded-full ${
                            careConfig[type as CareType]?.colorDot || 'bg-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Overdue indicator */}
                  {hasOverdue && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Weekly view ── */}
        {viewMode === 'weekly' && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar py-2">
            {weekDays.map((day, i) => {
              const key = dateKeyFromDate(day);
              const dayTasks = tasksByDate[key] || [];
              const isT = isSameDay(day, today);
              const isSel = isSameDay(day, selectedDay);

              return (
                <button key={i} onClick={() => setSelectedDay(day)}
                  className={`flex flex-col items-center justify-center flex-shrink-0
                    transition-all ${isSel
                      ? 'min-w-[72px] h-[96px] rounded-[2.5rem] bg-accent text-primary shadow-sm'
                      : `min-w-[64px] h-[84px] rounded-[2rem] bg-card text-muted-foreground
                         hover:bg-muted shadow-sm border border-border/50`
                    }`}
                >
                  {isT && isSel && (
                    <span className="absolute top-2 w-1.5 h-1.5 bg-primary rounded-full" />
                  )}
                  <span className={`text-label-sm uppercase mb-1 ${isSel ? 'opacity-80 mt-2' : 'opacity-70'}`}>
                    {dayNames[i]}
                  </span>
                  <span className={`font-headline leading-none ${isSel ? 'text-[28px] font-bold' : 'text-[24px] font-medium'}`}>
                    {day.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {[...new Set(dayTasks.map(t => t.actionType))].map(type => (
                        <span key={type}
                          className={`w-1.5 h-1.5 rounded-full ${
                            careConfig[type as CareType]?.colorDot || 'bg-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Selected Day Detail Panel ── */}
      <div className="bg-card rounded-3xl border border-border/50 shadow-sm p-5 sm:p-8">
        <h3 className="font-headline text-xl font-medium text-primary mb-4">
          {selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>

        {selectedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CuteMonsteraPlant size={80} className="opacity-60 mb-4" />
            <p className="text-body-md text-muted-foreground">
              {t('care.noTasksForDay')}
            </p>
          </div>
        ) : (
          (() => {
            // Allow completion only for today and overdue tasks
            const isSelectedToday = isSameDay(selectedDay, today);
            const isSelectedPast = selectedDay < today;
            const canComplete = isSelectedToday || isSelectedPast;
            return (
              <div className="flex flex-col gap-6">
                {/* Locked hint for future dates */}
                {!canComplete && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[12px]">{t('care.taskLockedHint')}</span>
                  </div>
                )}
                {/* Morning tasks */}
                {morningTasks.length > 0 && (
                  <section className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-muted-foreground" />
                      <span className="text-label-sm text-muted-foreground uppercase tracking-wider">{t('care.morning')}</span>
                    </div>
                    {morningTasks.map(task => (
                      <TaskRow key={task.id} task={task} onComplete={onComplete} allowComplete={canComplete} />
                    ))}
                  </section>
                )}

                {/* Afternoon tasks */}
                {afternoonTasks.length > 0 && (
                  <section className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Sunset className="h-4 w-4 text-muted-foreground" />
                      <span className="text-label-sm text-muted-foreground uppercase tracking-wider">{t('care.afternoon')}</span>
                    </div>
                    {afternoonTasks.map(task => (
                      <TaskRow key={task.id} task={task} onComplete={onComplete} allowComplete={canComplete} />
                    ))}
                  </section>
                )}
              </div>
            );
          })()
        )}
      </div>

      {/* ── Care Legend + Quick Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Legend */}
        <div className="bg-card rounded-3xl border border-border/50 shadow-sm p-5 sm:p-6">
          <h3 className="font-headline text-lg font-medium text-primary mb-4">
            {t('care.legend')}
          </h3>
          <div className="flex flex-col gap-3">
            {(['water', 'mist', 'fertilize'] as CareType[]).map(type => {
              const config = careConfig[type];
              const Icon = config.icon;
              return (
                <div key={type} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${config.colorBadge}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-body-md font-medium text-foreground">{t(`care.${type}Label`)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-card rounded-3xl border border-border/50 shadow-sm p-5 sm:p-6">
          <h3 className="font-headline text-lg font-medium text-primary mb-4">
            {t('care.thisMonth')}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <span className="font-headline text-2xl font-bold text-primary">{waterCount}</span>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">
                {t('care.waterLabel')}
              </p>
            </div>
            <div className="text-center">
              <span className="font-headline text-2xl font-bold text-primary">{mistCount}</span>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">
                {t('care.mistLabel')}
              </p>
            </div>
            <div className="text-center">
              <span className="font-headline text-2xl font-bold text-primary">{fertilizeCount}</span>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">
                {t('care.fertilizeLabel')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Task Row Sub-Component ───
function TaskRow({
  task,
  onComplete,
  allowComplete = true,
}: {
  task: DerivedCareTask;
  onComplete: (id: string) => Promise<void>;
  allowComplete?: boolean;
}) {
  const config = careConfig[task.actionType as CareType] || careConfig.water;
  const Icon = config.icon;
  const { t } = useTranslation();

  const canInteract = allowComplete && !task.isCompleted;

  return (
    <div className={`bg-background rounded-xl p-4 flex items-center justify-between
      group border transition-colors ${task.isCompleted
        ? 'opacity-60 border-border'
        : !allowComplete
          ? 'opacity-70 border-transparent'
          : 'border-transparent hover:border-border'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${config.colorBadge}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h4 className={`text-body-md font-medium leading-tight ${
            task.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}>
            {task.plantName}
          </h4>
          <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] uppercase
            tracking-wider font-semibold border ${config.colorBadge}`}>
            {t(`care.${task.actionType}Label`)}
          </span>
        </div>
      </div>

      <button
        aria-label={task.isCompleted ? 'Completed' : !allowComplete ? 'Locked' : 'Mark complete'}
        onClick={() => canInteract && onComplete(task.id)}
        disabled={!canInteract}
        className={`w-7 h-7 rounded-full flex items-center justify-center
          transition-colors shrink-0 ${task.isCompleted
            ? 'bg-primary border-2 border-primary text-primary-foreground'
            : !allowComplete
              ? 'border-2 border-border/50 text-muted-foreground/40 cursor-not-allowed'
              : 'border-2 border-border group-hover:border-primary hover:bg-muted cursor-pointer'
          }`}
      >
        {task.isCompleted ? (
          <Check className="h-4 w-4" />
        ) : !allowComplete ? (
          <Lock className="h-3 w-3" />
        ) : null}
      </button>
    </div>
  );
}
