// src/components/plants/PlantCard.tsx
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

export function PlantCard({ plant }: PlantCardProps) {
  const watering = getWateringStatus(plant.next_water_date);

  return (
    <Link to={`/plants/${plant.id}`} className="block">
      <Card className="min-w-[260px] max-w-[260px] snap-center overflow-hidden
        group cursor-pointer hover:shadow-md transition-shadow border-border/50">

        {/* Image area */}
        <div className="h-48 overflow-hidden relative bg-muted">
          {plant.image_url ? (
            <img 
              src={plant.image_url} 
              alt={plant.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent/40 to-primary/20
              flex items-center justify-center group-hover:scale-105
              transition-transform duration-500">
              <Leaf className="h-12 w-12 text-primary/40" />
            </div>
          )}

          {/* Sunlight badge */}
          {plant.sunlight_requirement && (
            <Badge variant="secondary"
              className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm
                text-primary border-0 shadow-sm gap-1">
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
}
