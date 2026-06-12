'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Droplet, Leaf, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type CareType = 'watering' | 'misting' | 'fertilizing';

interface CareActivity {
  date: number;
  type: CareType;
}

interface PlantCare {
  [date: number]: CareActivity[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const careIcons: Record<CareType, { icon: React.ReactNode; label: string; color: string }> = {
  watering: {
    icon: <Droplet size={16} />,
    label: 'Water',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  },
  misting: {
    icon: <Sprout size={16} />,
    label: 'Mist',
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
  },
  fertilizing: {
    icon: <Leaf size={16} />,
    label: 'Fertilize',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  }
};

export function PlantCareCalendar({ plantName = "My Plant" }: { plantName?: string }) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4)); // May 2026
  const [careActivities, setCareActivities] = useState<PlantCare>({
    5: [{ date: 5, type: 'watering' }],
    8: [{ date: 8, type: 'misting' }],
    12: [{ date: 12, type: 'watering' }, { date: 12, type: 'fertilizing' }],
    15: [{ date: 15, type: 'misting' }],
    19: [{ date: 19, type: 'watering' }],
    22: [{ date: 22, type: 'misting' }],
    26: [{ date: 26, type: 'watering' }, { date: 26, type: 'fertilizing' }],
  });

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const toggleCareActivity = (day: number, careType: CareType) => {
    setCareActivities(prev => {
      const dayActivities = prev[day] || [];
      const existingIndex = dayActivities.findIndex(a => a.type === careType);

      if (existingIndex > -1) {
        const updated = dayActivities.filter((_, i) => i !== existingIndex);
        if (updated.length === 0) {
          const newActivities = { ...prev };
          delete newActivities[day];
          return newActivities;
        }
        return { ...prev, [day]: updated };
      } else {
        return {
          ...prev,
          [day]: [...dayActivities, { date: day, type: careType }]
        };
      }
    });
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const monthYear = `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-headline text-4xl sm:text-5xl font-semibold text-primary mb-2">
            {plantName}
          </h1>
          <p className="text-muted-foreground text-lg">
            Track your plant care routine
          </p>
        </div>

        {/* Main Calendar Card */}
        <Card className="bg-card border border-border shadow-sm rounded-2xl p-6 sm:p-8">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              className="rounded-full hover:bg-muted"
            >
              <ChevronLeft size={20} />
            </Button>
            <h2 className="font-headline text-2xl sm:text-3xl font-medium text-primary">
              {monthYear}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              className="rounded-full hover:bg-muted"
            >
              <ChevronRight size={20} />
            </Button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {DAYS.map(day => (
              <div
                key={day}
                className="text-center text-sm font-semibold text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty days before month starts */}
            {emptyDays.map(i => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Days of month */}
            {days.map(day => {
              const activities = careActivities[day] || [];
              const isToday = new Date().getDate() === day &&
                            new Date().getMonth() === currentDate.getMonth() &&
                            new Date().getFullYear() === currentDate.getFullYear();

              return (
                <div
                  key={day}
                  className={`
                    aspect-square rounded-xl border-2 p-2 transition-all
                    flex flex-col items-center justify-between cursor-pointer
                    hover:border-primary/50 hover:bg-muted/50
                    ${isToday ? 'border-accent bg-accent/10 shadow-md' : 'border-border bg-background'}
                  `}
                >
                  <span className={`
                    text-sm font-semibold
                    ${isToday ? 'text-accent-foreground' : 'text-foreground'}
                  `}>
                    {day}
                  </span>

                  {/* Care activity indicators */}
                  <div className="flex flex-col gap-1 w-full mt-auto">
                    {activities.map((activity, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleCareActivity(day, activity.type)}
                        className={`
                          flex items-center justify-center px-1.5 py-0.5 rounded-full
                          text-xs font-medium transition-all hover:scale-110
                          ${careIcons[activity.type].color}
                        `}
                        title={careIcons[activity.type].label}
                      >
                        {careIcons[activity.type].icon}
                      </button>
                    ))}

                    {/* Quick add buttons for empty slots */}
                    {activities.length === 0 && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleCareActivity(day, 'watering')}
                          className="flex-1 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                          title="Water"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Care Legend */}
        <Card className="bg-card border border-border rounded-2xl p-6 mt-8">
          <h3 className="font-headline text-xl font-medium text-primary mb-4">
            Care Activities
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(careIcons).map(([key, { icon, label, color }]) => (
              <div key={key} className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${color}`}>
                  {icon}
                </div>
                <div>
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {key === 'watering' && 'Hydration'}
                    {key === 'misting' && 'Humidity'}
                    {key === 'fertilizing' && 'Nutrients'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          {Object.entries(careIcons).map(([key, { label, color }]) => {
            const count = Object.values(careActivities).flat()
              .filter(a => a.type === key).length;
            return (
              <Card key={key} className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-primary">{count}</p>
                <p className="text-sm text-muted-foreground mt-1">{label} scheduled</p>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
