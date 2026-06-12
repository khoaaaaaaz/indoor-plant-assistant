// src/components/plants/PlantCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Droplets, Sun, Cloud, Leaf } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Plant } from '@/types';

interface PlantCardProps {
  plant: Plant;
}

/** Compute "In X days" or "Today" or "Overdue" from next_water_date */
function getWateringStatus(dateStr: string | null) {
  if (!dateStr) return { label: 'Not set', isUrgent: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const waterDate = new Date(dateStr);
  waterDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (waterDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return { label: 'Overdue', isUrgent: true };
  if (diffDays === 0) return { label: 'Today', isUrgent: true };
  if (diffDays === 1) return { label: 'Tomorrow', isUrgent: false };
  return { label: `In ${diffDays} days`, isUrgent: false };
}

/** Map sunlight_requirement string to icon */
function getSunlightIcon(req: string | null) {
  if (!req) return <Leaf className="h-3.5 w-3.5" />;
  const lower = req.toLowerCase();
  if (lower.includes('low')) return <Cloud className="h-3.5 w-3.5" />;
  return <Sun className="h-3.5 w-3.5" />;
}

// Wrapped in React.memo: prevents re-render when parent Dashboard updates
// but this specific plant's data hasn't changed.
export const PlantCard = React.memo(function PlantCard({ plant }: PlantCardProps) {
  const watering = getWateringStatus(plant.next_water_date);

  return (
    <Link to={`/plants/${plant.id}`} className="block">
      <Card className={`min-w-[260px] max-w-[260px] snap-center overflow-hidden
        group cursor-pointer hover:shadow-md transition-all duration-300
        ${plant.has_active_disease 
          ? 'border-rose-400/60 shadow-[0_0_15px_rgba(225,29,72,0.1)] dark:border-rose-900/60' 
          : 'border-border/50'
        }`}>

        {/* Image area */}
        <div className="aspect-[4/3] overflow-hidden relative bg-muted">
          {plant.image_url ? (
            <img 
              src={plant.image_url} 
              alt={plant.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent/40 to-primary/20
              flex items-center justify-center group-hover:scale-105
              transition-transform duration-500">
              <Leaf className="h-12 w-12 text-primary/40" />
            </div>
          )}

          {/* Subtle gradient overlay for badge readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-transparent pointer-events-none" />

          {/* Sunlight badge */}
          {plant.sunlight_requirement && (
            <Badge variant="secondary"
              className="absolute top-3 left-3 bg-white/90 dark:bg-card/90 backdrop-blur-md
                text-primary border-0 shadow-sm gap-1 text-[11px]">
              {getSunlightIcon(plant.sunlight_requirement)}
              {plant.sunlight_requirement}
            </Badge>
          )}
        </div>

        {/* Info */}
        <CardContent className="p-4">
          <h4 className="font-headline text-[22px] text-primary mb-1 truncate">
            {plant.name}
          </h4>
          <p className="text-body-md text-muted-foreground italic text-sm mb-4 truncate">
            {plant.species || 'Unknown species'}
          </p>

          {/* Watering status footer */}
          <div className="flex justify-between items-center pt-3 border-t border-border/50">
            <div className={`flex items-center gap-2 ${watering.isUrgent ? 'text-destructive' : 'text-muted-foreground'
              }`}>
              <Droplets className={`h-4 w-4 ${watering.isUrgent ? 'fill-destructive' : 'text-primary'
                }`} />
              <span className="text-label-sm text-xs">{watering.label}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});
