// src/components/scan/HealthCheckDialog.tsx
import { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, Upload, Loader2, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { scanApi } from '@/services/api';
import { PhotoTips, HEALTH_CHECK_TIPS } from './PhotoTips';
import { CameraFrameGuide } from './CameraFrameGuide';
import type { DiseaseScanResult, DiseaseLog } from '@/types';
import { useTranslation } from 'react-i18next';
import { translateDisease } from '@/lib/translate';
import { useImageCapture } from '@/hooks/useImageCapture';
import { usePlantStore } from '@/store/plantStore';
import { toast } from 'sonner';

const MAX_FILE_SIZE_MB = 10;

interface HealthCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantId: number;
  plantName: string;
  onScanComplete?: () => void; // Callback to refresh disease logs
}

export function HealthCheckDialog({
  open,
  onOpenChange,
  plantId,
  plantName,
  onScanComplete,
}: HealthCheckDialogProps) {
  const [step, setStep] = useState<'select' | 'preview' | 'scanning' | 'result'>('select');
  const [result, setResult] = useState<DiseaseScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { t, i18n } = useTranslation();

  const { prepareImage, createSignal, cancel } = useImageCapture();
  const { setPendingDiseaseLog, setLastDiseaseResult } = usePlantStore();

  // Preview URL (memoised, revoked on cleanup)
  const previewUrl = useMemo(() => {
    if (selectedFile) return URL.createObjectURL(selectedFile);
    return null;
  }, [selectedFile]);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const loadingSteps = useMemo(() => [
    t('scan.healthUploading', 'Uploading scan...'),
    t('scan.healthAnalyzing', 'Running pathology analysis...'),
    t('scan.healthWeather', 'Checking local weather conditions...'),
    t('scan.healthTreatment', 'Consulting treatment database...'),
    t('scan.healthRecommendations', 'Generating care recommendations...'),
  ], [t]);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === 'scanning') {
      setLoadingStepIndex(0);
      interval = setInterval(() => {
        setLoadingStepIndex((prev) => (prev + 1) % loadingSteps.length);
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [step, loadingSteps.length]);

  // ── File validation + preview ──
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers onChange
    e.target.value = '';

    // Size guard
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(t('scan.fileTooLarge'));
      return;
    }

    setSelectedFile(file);
    setError(null);
    setStep('preview');
  };

  // ── Start scan from preview ──
  const handleScan = async () => {
    if (!selectedFile) return;
    setStep('scanning');
    setError(null);
    setPendingDiseaseLog(plantId, true);

    try {
      setIsCompressing(true);
      const compressedFile = await prepareImage(selectedFile);
      setIsCompressing(false);

      const signal = createSignal();

      const response = await scanApi.diagnosePlant(
        plantId,
        compressedFile,
        undefined,  // latitude
        undefined,  // longitude
        i18n.language,  // pass current language for LLM response
        { signal }
      );

      const realResult = response.data;

      // Coerce DiseaseScanResult to DiseaseLog for cache
      const logCache: DiseaseLog = {
        id: realResult.scan_id,
        plant_id: realResult.plant_id,
        disease_name: realResult.disease_detected,
        confidence: realResult.disease_confidence,
        detected_species: null,
        image_url: realResult.image_url,
        env_temperature: realResult.env_temperature,
        env_humidity: realResult.env_humidity,
        soil_moisture: realResult.soil_moisture,
        scanned_at: realResult.scanned_at,
        treatment_recommendation: realResult.treatment_recommendation,
        care_adjustments: realResult.care_adjustments ?? null,
        species_affinity_warning: realResult.species_affinity_warning,
        treatment_duration_days: null,
        expected_resolve_date: null,
        feedback_score: null,
        feedback_note: null,
        resolved_at: null,
      };

      setLastDiseaseResult(plantId, logCache);
      setResult(realResult);
      setStep('result');
      setPendingDiseaseLog(plantId, false);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        console.log('Diagnosis request aborted.');
        setPendingDiseaseLog(plantId, false);
        return;
      }

      setError(err.response?.data?.detail || 'Scan failed. Please try again.');
      setStep('select');
      setPendingDiseaseLog(plantId, false);
    }
  };

  const handleRetake = () => {
    setSelectedFile(null);
    setError(null);
    setStep('select');
  };

  const handleRetry = () => {
    if (selectedFile) handleScan();
  };

  const handleClose = () => {
    cancel();
    setPendingDiseaseLog(plantId, false);
    // If we got a result, trigger refresh of disease logs
    if (step === 'result' && onScanComplete) {
      onScanComplete();
    }
    setStep('select');
    setResult(null);
    setError(null);
    setSelectedFile(null);
    onOpenChange(false);
  };

  const isHealthy = result && !result.disease_detected;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-headline-lg-mobile text-primary">
            {step === 'select' && t('scan.healthCheck')}
            {step === 'preview' && t('scan.previewTitle')}
            {step === 'scanning' && t('scan.analyzing')}
            {step === 'result' && (isHealthy ? t('scan.lookingHealthy') : t('scan.issueDetected'))}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: Select image ── */}
        {step === 'select' && (
          <div className="flex flex-col gap-4 py-4">
            {error ? (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <AlertTriangle className="h-10 w-10 text-rose-500" />
                <p className="text-rose-500 font-semibold text-[15px]">{error}</p>
                <p className="text-muted-foreground text-sm">
                  We saved your photo of <strong>{selectedFile?.name || 'leaf'}</strong>. Would you like to try scanning it again?
                </p>
                <div className="flex gap-2.5 w-full mt-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl text-sm"
                    onClick={() => {
                      setError(null);
                      setSelectedFile(null);
                    }}
                  >
                    {t('scan.cancel')}
                  </Button>
                  <Button className="flex-1 rounded-xl gap-2 text-sm" onClick={handleRetry}>
                    <RefreshCw className="h-4 w-4" /> {t('scan.retry')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-body-md text-muted-foreground text-center">
                  {t('scan.healthCheckDescription', { plantName })}
                </p>

                {/* Photo tips — all 5 tips for health check */}
                <PhotoTips tips={HEALTH_CHECK_TIPS} />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-24 flex-col gap-2 rounded-xl"
                    onClick={() => {
                      cameraInputRef.current?.click();
                    }}
                  >
                    <Camera className="h-6 w-6 text-primary" />
                    <span className="text-label-sm">{t('scan.camera')}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-24 flex-col gap-2 rounded-xl"
                    onClick={() => {
                      galleryInputRef.current?.click();
                    }}
                  >
                    <Upload className="h-6 w-6 text-primary" />
                    <span className="text-label-sm">{t('scan.gallery')}</span>
                  </Button>
                </div>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  multiple={false}
                  className="hidden"
                  onChange={handleInputChange}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple={false}
                  className="hidden"
                  onChange={handleInputChange}
                />
              </>
            )}
          </div>
        )}

        {/* ── Step 2: Preview ── */}
        {step === 'preview' && previewUrl && (
          <div className="flex flex-col gap-4 py-4">
            {/* Thumbnail with CameraFrameGuide overlay */}
            <div className="relative aspect-[4/3] w-full max-w-sm mx-auto rounded-xl overflow-hidden border border-border/50 bg-muted flex items-center justify-center shadow-inner">
              <img
                src={previewUrl}
                alt="Preview"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 pointer-events-none">
                <CameraFrameGuide />
              </div>
            </div>

            {/* Tips reminder */}
            <PhotoTips tips={HEALTH_CHECK_TIPS} compact />

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl gap-2"
                onClick={handleRetake}
              >
                <RefreshCw className="h-4 w-4" />
                {t('scan.retake')}
              </Button>
              <Button
                className="flex-1 rounded-xl gap-2"
                onClick={handleScan}
              >
                <Camera className="h-4 w-4" />
                {t('scan.scanNow')}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Scanning ── */}
        {step === 'scanning' && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-body-md text-muted-foreground animate-pulse text-center">
              {isCompressing ? t('scan.compressing', 'Compressing leaf photo...') : loadingSteps[loadingStepIndex]}
            </p>
          </div>
        )}

        {/* ── Step 4: Result ── */}
        {step === 'result' && result && (
          <div className="flex flex-col gap-4 py-2">
            {/* Status icon */}
            <div className="flex justify-center">
              {isHealthy ? (
                <div className="w-16 h-16 rounded-full bg-accent/30 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-secondary" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              )}
            </div>

            {/* Disease name + confidence */}
            <div className="text-center">
              <h3 className="font-headline text-xl text-primary font-semibold">
                {result.disease_detected
                  ? translateDisease(result.disease_detected, t)
                  : t('scan.lookingHealthy')}
              </h3>
              {result.disease_confidence && (
                <div className="mt-2.5">
                  <Badge variant="outline" className={`gap-1 text-[12px] font-semibold py-0.5 px-2.5 border ${result.disease_confidence >= 0.8
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                    : result.disease_confidence >= 0.6
                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50'
                    }`}>
                    {Math.round(result.disease_confidence * 100)}% {t('scan.confidence')}
                  </Badge>
                </div>
              )}
            </div>

            {/* Species-disease affinity warning */}
            {result.species_affinity_warning && (
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-3.5 text-left">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                  {result.species_affinity_warning}
                </p>
              </div>
            )}

            {/* Environment data badges */}
            <div className="flex flex-wrap gap-2 justify-center">
              {result.env_temperature && (
                <Badge variant="secondary" className="gap-1">
                  🌡️ {result.env_temperature}°C
                </Badge>
              )}
              {result.env_humidity && (
                <Badge variant="secondary" className="gap-1">
                  💧 {result.env_humidity}% humidity
                </Badge>
              )}
              {result.next_water_date && (
                <Badge variant="secondary" className="gap-1">
                  📅 Water: {new Date(result.next_water_date).toLocaleDateString()}
                </Badge>
              )}
            </div>

            {/* Treatment recommendation from LLM */}
            {!isHealthy && result.treatment_recommendation && (
              <div className="bg-muted rounded-xl p-4 text-left max-h-60 overflow-y-auto">
                <h4 className="text-label-sm font-semibold text-primary mb-2">
                  💡 {t('scan.treatmentAdvice')}
                </h4>
                <div className="text-body-md text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {result.treatment_recommendation}
                </div>
              </div>
            )}

            {/* Close button */}
            <Button onClick={handleClose} className="rounded-xl mt-2">
              {t('scan.done')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
