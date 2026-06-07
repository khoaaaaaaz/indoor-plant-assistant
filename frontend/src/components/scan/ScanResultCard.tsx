// src/components/scan/ScanResultCard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Sun, Droplets, Shield, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePlantStore } from '@/store/plantStore';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { translateSpecies, translateBotanical } from '@/lib/translate';

import type { SpeciesScanResult } from '@/types';

import { plantApi } from '@/services/api';

interface ScanResultCardProps {
  result: SpeciesScanResult;
  onClose: () => void;
}

export function ScanResultCard({ result, onClose }: ScanResultCardProps) {
  const navigate = useNavigate();
  const { addPlantOptimistic, confirmPlant, rollbackPlant } = usePlantStore();
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  const handleAddToGarden = async () => {
    setSaving(true);
    
    const plantData = {
      name: nickname || result.species_identified || 'My Plant',
      species: result.species_identified,
      image_url: result.image_url,
      sunlight_requirement: result.sunlight_requirement,
      watering_guide: result.watering_guide,
      care_level: result.care_level,
      is_toxic_to_pets: result.is_toxic_to_pets,
      botanical_data: result.botanical_data,
    };

    const tempId = addPlantOptimistic(plantData);
    
    onClose();
    navigate(`/plants/${tempId}`);
    toast.success('Plant added to your garden! 🌿');

    try {
      const response = await plantApi.create(plantData);
      confirmPlant(tempId, response.data);
      
      if (window.location.pathname === `/plants/${tempId}`) {
        navigate(`/plants/${response.data.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Error adding plant:', error);
      rollbackPlant(tempId);
      toast.error('Failed to add plant. Please try again.');
      
      if (window.location.pathname === `/plants/${tempId}`) {
        navigate(`/dashboard`, { replace: true });
      }
    }
  };

  const bd = result.botanical_data;

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Hero image + species name */}
      {result.image_url && (
        <div className="relative w-full h-44 rounded-xl overflow-hidden border border-border/50">
          <img
            src={result.image_url}
            alt={result.species_identified || 'Scanned plant'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="font-headline text-lg text-white font-semibold drop-shadow-md">
              {translateSpecies(result.species_identified || 'Unknown Species', t)}
            </h3>
            {result.confidence && (
              <p className="text-[12px] text-white/80 mt-0.5">
                {Math.round(result.confidence * 100)}% {t('scan.confidence', 'confidence')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Description summary */}
      {result.description && (
        <p className="text-body-md text-muted-foreground line-clamp-2 px-1">
          {result.description}
        </p>
      )}

      {/* Care info badges */}
      <div className="flex flex-wrap gap-2 justify-center">
        {result.sunlight_requirement && (
          <Badge variant="secondary" className="gap-1">
            <Sun className="h-3 w-3" /> {translateBotanical(result.sunlight_requirement, t)}
          </Badge>
        )}
        {result.watering_guide && (
          <Badge variant="secondary" className="gap-1">
            <Droplets className="h-3 w-3" /> {translateBotanical(result.watering_guide, t)}
          </Badge>
        )}
        {result.care_level && (
          <Badge variant="secondary" className="gap-1">
            <Leaf className="h-3 w-3" /> {translateBotanical(result.care_level, t)}
          </Badge>
        )}
        {result.is_toxic_to_pets ? (
          <Badge variant="destructive" className="gap-1">
            <Shield className="h-3 w-3" /> {t('plant.toxic')}
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 text-emerald-600">
            <ShieldCheck className="h-3 w-3" /> {t('plant.petFriendly')}
          </Badge>
        )}
        {/* Perk badges from botanical_data */}
        {bd?.drought_tolerant && (
          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
            🏜️ {t('plantDetail.droughtTolerant', 'Drought Tolerant')}
          </Badge>
        )}
        {bd?.medicinal && (
          <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50">
            💊 {t('plantDetail.medicinal', 'Medicinal')}
          </Badge>
        )}
      </div>

      {/* Nickname input */}
      <div>
        <label className="text-label-sm text-muted-foreground mb-1.5 block">
          {t('scan.nickname')}
        </label>
        <Input
          placeholder={result.species_identified || 'My Plant'}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="rounded-xl"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
          {t('scan.cancel')}
        </Button>
        <Button onClick={handleAddToGarden} disabled={saving} className="flex-1 rounded-xl">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Adding...
            </>
          ) : (
            <>
              <Leaf className="h-4 w-4 mr-1" /> {t('scan.addToGarden')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
